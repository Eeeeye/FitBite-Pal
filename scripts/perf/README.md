# FitBite 首页与计划锁的本机压测

从仓库根目录使用 Bash 执行下列步骤。需要 JDK 17 或更高版本、Maven、Node.js 20 或更高版本、Python 3、curl、MySQL 8 客户端和服务端、Redis 7 客户端和服务端。两个驱动均使用语言自带的库。使用专供本次测试的本机 MySQL、Redis 实例。数据库名及 Redis 逻辑库编号见下文，首页实验会清空 Redis DB 8。

| 场景 | 驱动比较的工作 |
| --- | --- |
| `home` | 模拟有历史数据的普通用户登录后的首页首次访问。旧版同时预取图表、历史和饮食等数据，新版只加载当前可见的首页数据。计时包含 HTTP 往返与服务端处理，跳过界面定时器和渲染。 |
| `chart-plan` | 显式加载同一份七日热量图与当天计划。驱动校验七天的热量和当前计划条数。旧版附带的额外日期也是其实际开销。 |
| `mixed` | 训练计划已预热，同时从一个账号发起读取与同日打卡。每波验证打卡只写入一行，所有读取返回相同计划 ID。 |
| `held_lock_cold_read` | 仅移除压测账号当天训练的缓存。已发布计划仍在 MySQL 中。单独连接持有该用户行锁 100 ms，记录释放前完成的读请求数和数据库锁等待。它测量特定竞争条件下的影响。 |

## 1. 编译两个版本

先检出需要比较的候选版本，再用 Git 导出固定对照提交。在同一终端保存工作目录与临时凭据。

```bash
set -euo pipefail
umask 077
bench_repo="$(git rev-parse --show-toplevel)"
cd "$bench_repo"
bench_dir="$(mktemp -d)"
mkdir -p "$bench_dir/baseline"
git archive 459e68b FitBitePal-Backend | tar -x -C "$bench_dir/baseline"
mvn -q -f "$bench_dir/baseline/FitBitePal-Backend/pom.xml" -DskipTests package
cp "$bench_dir/baseline/FitBitePal-Backend/target/backend-1.0.0.jar" "$bench_dir/before.jar"
mvn -q -f FitBitePal-Backend/pom.xml -DskipTests clean package
cp FitBitePal-Backend/target/backend-1.0.0.jar "$bench_dir/after.jar"
git rev-parse HEAD > "$bench_dir/candidate.commit"
```

## 2. 初始化三个空库

将 `MYSQL_ADMIN_CNF` 设为本机测试 MySQL 的管理员选项文件绝对路径，其中的 `[client]` 应配置回环地址、端口和凭据。专用实例启用 Performance Schema 的 statement digest 统计。首屏驱动按固定库名 `fitbite_perf` 读取 SELECT 次数。两个锁实验用单独的库，避免测试账号或写入互相影响。

```bash
: "${MYSQL_ADMIN_CNF:?请先设置测试实例的 MySQL 管理员选项文件绝对路径}"
export TZ=Asia/Shanghai
export PERF_MYSQL="$(command -v mysql)"
export PERF_MYSQL_CNF="$bench_dir/bench.cnf"
export MYSQL_PORT="$(mysql --defaults-file="$MYSQL_ADMIN_CNF" -Ns -e 'SELECT @@port')"
export REDIS_PORT="${REDIS_PORT:-6379}"
export SPRING_DATASOURCE_USERNAME=fitbite_perf_app
export SPRING_DATASOURCE_PASSWORD="$(python3 -c 'import secrets; print(secrets.token_hex(20))')"
export JWT_SECRET="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
export PERF_PASSWORD="$(python3 -c 'import secrets; print(secrets.token_hex(16))')"
mysql --defaults-file="$MYSQL_ADMIN_CNF" <<SQL
CREATE DATABASE fitbite_perf CHARACTER SET utf8mb4;
CREATE DATABASE fitbite_lockbench_before CHARACTER SET utf8mb4;
CREATE DATABASE fitbite_lockbench_after CHARACTER SET utf8mb4;
CREATE USER 'fitbite_perf_app'@'127.0.0.1' IDENTIFIED BY '${SPRING_DATASOURCE_PASSWORD}';
GRANT ALL ON fitbite_perf.* TO 'fitbite_perf_app'@'127.0.0.1';
GRANT ALL ON fitbite_lockbench_before.* TO 'fitbite_perf_app'@'127.0.0.1';
GRANT ALL ON fitbite_lockbench_after.* TO 'fitbite_perf_app'@'127.0.0.1';
GRANT SELECT ON performance_schema.events_statements_summary_by_digest TO 'fitbite_perf_app'@'127.0.0.1';
SQL
cat > "$PERF_MYSQL_CNF" <<CNF
[client]
protocol=tcp
host=127.0.0.1
port=$MYSQL_PORT
user=$SPRING_DATASOURCE_USERNAME
password=$SPRING_DATASOURCE_PASSWORD
CNF
for db in fitbite_perf fitbite_lockbench_before fitbite_lockbench_after; do
  mysql --defaults-file="$PERF_MYSQL_CNF" "$db" < FitBitePal-Backend/src/main/resources/db/baseline/mysql8.sql
done
```

## 3. 启动与准备样本

以下函数启动本地 JAR 并等待健康检查。首页使用固定 384 MiB 堆与生产配置，锁实验使用 192–384 MiB 堆、4 个可用 CPU 和上限为 12 的 JDBC 连接池。两个版本在各自的场景中使用相同参数。示例关闭邮件探针，AI 和外部邮件均不参与业务负载。

```bash
export SERVER_ADDRESS=127.0.0.1 REDIS_HOST=127.0.0.1
export SPRING_JPA_HIBERNATE_DDL_AUTO=validate SPRING_JPA_SHOW_SQL=false
export AI_ENABLED=false ARK_ENABLED=false POSE_ENABLED=false ARK_API_KEY=''
export MAIL_USERNAME='' MAIL_PASSWORD='' MAIL_FROM='qa@example.test' FITBITE_ADMIN_PASSWORD=''
export MANAGEMENT_HEALTH_MAIL_ENABLED=false
export SPRING_PROFILES_ACTIVE=prod,localmail
start_app() {
  local variant="$1" port="$2" schema="$3" db="$4"
  local -a jvm=(-Xms384m -Xmx384m)
  local pool=20 idle=10 app_profile=prod,localmail app_log=INFO
  if [[ "$schema" == fitbite_lockbench_* ]]; then
    jvm=(-Xms192m -Xmx384m -XX:ActiveProcessorCount=4)
    pool=12; idle=4; app_profile=localmail; app_log=WARN
  fi
  SERVER_PORT="$port" REDIS_DATABASE="$db" LOG_PATH="$bench_dir/log-$port" \
    SPRING_PROFILES_ACTIVE="$app_profile" LOGGING_LEVEL_COM_FITBITEPAL_BACKEND="$app_log" LOGGING_LEVEL_ROOT=WARN \
    SPRING_DATASOURCE_URL="jdbc:mysql://127.0.0.1:$MYSQL_PORT/$schema?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai" \
    SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE="$pool" SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE="$idle" \
    java "${jvm[@]}" -jar "$bench_dir/$variant.jar" > "$bench_dir/http-$port.log" 2>&1 &
  app_pid=$!
  for ((i=0; i<120; i++)); do
    kill -0 "$app_pid" 2>/dev/null || { cat "$bench_dir/http-$port.log"; return 1; }
    if curl -fsS "http://127.0.0.1:$port/api/actuator/health" 2>/dev/null | grep -q '"UP"'; then return; fi
    sleep 0.5
  done
  kill "$app_pid"; return 1
}
stop_app() { kill "$1"; wait "$1" || true; }

export PERF_PORT=29690
start_app before "$PERF_PORT" fitbite_perf 8
python3 - <<'PY'
import json, os, urllib.request
body = dict(username='fbperf000', email='fbperf000@example.test', password=os.environ['PERF_PASSWORD'])
url = 'http://127.0.0.1:' + os.environ['PERF_PORT'] + '/api/auth/register'
req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req, timeout=10) as res:
    assert json.load(res)['success'] is True
PY
mysql --defaults-file="$PERF_MYSQL_CNF" --init-command="SET time_zone='+08:00'" fitbite_perf < scripts/perf/home-seed.sql
stop_app "$app_pid"
```

脚本复用第一个账号由应用写入的密码哈希，得到 32 个账号、17,280 条完成记录与 1,632 条训练计划记录。两版共用这份首页只读数据。Node、Python、JVM 和造数 SQL 应使用同一业务日期，选择不会横跨午夜的测试窗口。

## 4. 首页与等功能对照

每个客户端维持最多 6 条 HTTP 连接。每次驱动进程先登录 32 个测试账号、预热，再开始采样。下例每个版本跑三轮，轮间交替执行顺序。每次重启都只清空专用 Redis DB 8。

```bash
export PERF_CLIENTS=12 PERF_SAMPLES=192 PERF_SECONDS=0
for variant in before after after before before after; do
  redis-cli -h 127.0.0.1 -p "$REDIS_PORT" -n 8 FLUSHDB >/dev/null
  start_app "$variant" "$PERF_PORT" fitbite_perf 8
  for scenario in home chart-plan; do
    node scripts/perf/home.mjs "$variant" "$scenario" >> "$bench_dir/home.jsonl"
  done
  stop_app "$app_pid"
done
```

同样的循环中，将 `PERF_CLIENTS=32 PERF_SECONDS=30` 并只运行 `home` 可复现定时负载。JSONL 逐轮记录完成流程数、请求数、成功流程/秒、响应字节、SELECT 次数及 P50/P95/P99 毫秒值。成功流程/秒以一次完整业务操作为单位，错误数和样本应一并报告。

## 5. 用户行锁对照

锁驱动自建测试账号、提交资料并生成计划，数据库与 Redis 逻辑库须和两个后端一一匹配。首页驱动应先退出，MySQL 行锁计数采用实例级增量。

```bash
start_app before 29691 fitbite_lockbench_before 9
before_pid="$app_pid"
start_app after 29692 fitbite_lockbench_after 10
after_pid="$app_pid"
python3 scripts/perf/plan-locks.py --mysql "$PERF_MYSQL" --mysql-config "$PERF_MYSQL_CNF" \
  --redis-port "$REDIS_PORT" --before-port 29691 --after-port 29692 \
  --before-redis-db 9 --after-redis-db 10 --readers 6 --writers 2 --hold-ms 100 \
  --warmup 12 --waves 18 --rounds 4 --output "$bench_dir/locks.json"
stop_app "$after_pid"
stop_app "$before_pid"
```

锁驱动在每一轮交换版本顺序，独立核对计划 ID 与打卡幂等性。比较相同场景、相同版本轮次的读写 P95/P99、`row_lock_waits` 与 `row_lock_wait_ms`。持锁实验额外报告 `finished_before_unlock`。结果文件保存在 `$bench_dir` 中。确认已留存所需的结果后，清理本次专用数据库、账号与临时凭据。
