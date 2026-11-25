# FitBite 发布候选验收

本页适用于从 `14581c9`（MySQL V9）升级到使用 V10、V11 的版本。前端、后端、schema、环境配置和缓存实例共同组成一次发布。每份候选 JAR 和前端导出目录应记录 SHA-256，并用这两份产物完成冒烟。

2026-11-25 的本机候选通过后端 63 项测试、客户端 28 项测试和六组浏览器业务流程。五次冷启动各使用 32 个并发客户端，首批请求与随后的资料读取均成功。停止 Redis 后，测试收件箱在 44.9 秒收到告警，恢复 Redis 后 20.1 秒收到解除通知。产物摘要、逐轮冷启动数据和恢复校验值见[本次验收结果](release-candidate-results.json)。

## 候选构建与检查

- 后端在 Java 17 或 21 上运行 Maven `verify`。仓库 CI 使用真实 MySQL、Redis 和 Mailpit，包括在空数据库按生产配置启动。回归用的库和 Redis 必须独立，测试会创建与删除数据表。使用一个单独的空 schema 验证建库脚本。
- 移动端使用锁文件安装并执行 `node --test tests/*.test.js`。先配置该环境的 `EXPO_PUBLIC_API_URL`。预览和正式 EAS 构建使用各自环境的 HTTPS API。本次原生 runtime 从 1.0.0 升至 1.1.0，新加入的安全存储模块需要重新安装原生包。
- 正式模式使用 `FITBITE_PUBLIC_RELEASE=1`，执行 `npx expo export --clear --platform android --platform ios`。本机浏览器预览可以用回环页面和回环 HTTP API。发布包忽略旧版客户端保留的自定义服务器地址。
- 用 [web-smoke.cjs](../scripts/release/web-smoke.cjs) 对实际导出的 Web 和独立 API 运行用户流程。指定 `FITBITE_SMOKE_WEB`、`FITBITE_SMOKE_API`、`PLAYWRIGHT_CORE`、`CHROME_BIN`。脚本会创建随机会员，所以目标应为回环测试部署。
- 发布时重查运行时依赖公告。后端使用 [audit-backend-jar.py](../scripts/release/audit-backend-jar.py) 扫描最终 JAR 的生产依赖，前端分开审视锁文件的 npm 公告与最终导出物包含的模块。

## 升级、回滚与再开放写入

1. 排空原 API 的写流量，停止旧实例及其定时任务。保存当前 JAR、客户端导出、配置和原 schema 的一致性备份，记录备份位置、创建时间和校验值。
2. 在隔离的新库验证备份可以恢复，原版本可以登录、读训练、检查打卡。现有 V9 库顺序执行 V10 和 V11。新建空库直接导入最新版 baseline。用新的专用 Redis 库冷启动，避免旧缓存隐藏迁移问题。
3. 在候选实例检查 readiness。用合成会员核对旧记录、进度、新目标和稳定餐食标记。新客户端须等新后端就绪后再分发。业务写流量开放前完成放行决定。升级后如有旧账号使用超过 BCrypt 72 个字节的历史密码，请通过已验证的找回密码流程重设。
4. 开放写入前需要回退时，使用旧 JAR、旧客户端、升级前备份恢复出的数据库和独立缓存。V10 的稳定餐食身份和隐藏状态超出旧版的数据模型。直接把旧 JAR 指回已迁移的数据库可能读错数据。
5. 开放写流量后，如需恢复服务，优先部署兼容新版 schema 的修正版，或从含有新写入的备份和 binlog 恢复到约定时间点。直接恢复升级前快照会丢失其后的用户写入。生产环境需要结合写入量约定恢复点、恢复时限和备份保留期。

[rehearse.py](../scripts/release/rehearse.py) 自动在三个新建的独立数据库里验证上面两条恢复路径。它先用原版创建会员、训练计划和打卡，再升级并通过候选新增历史打卡、勾选餐食和设置目标。回退演练在独立库启动原版。恢复候选时逐行比较 MySQL 数据转储的 SHA-256，并在冷缓存下重新登录验证业务值。执行所需参数可用 `python3 scripts/release/rehearse.py --help` 查看。[CI 工作流](../.github/workflows/release-rehearsal.yml) 包含完整命令和固定工具版本。输出文件夹含合成会员数据及数据库备份。CI 归档脱敏的恢复结果、依赖审计结果和浏览器测试日志。

## 本机监控与故障演练

将 `compose.monitoring.yml` 叠加到现有 Compose 配置。Prometheus 每 5 秒从独立进程探测 API。readiness 检查应用、MySQL 和 Redis，liveness 检查进程。邮件商故障仍可在整体健康检查中看到。readiness 连续失败 30 秒触发严重告警，探针访问耗时持续两分钟超过两秒触发警告。业务接口延迟需结合实际业务流量独立监控。

默认告警和恢复邮件送达本机测试收件箱，Compose 的收件页在 `127.0.0.1:8026`。对外部署前应配置已验证的接收者，通过 `FITBITE_ALERTMANAGER_CONFIG` 挂载真实路由；实际触发故障、核对值班人员能收到与解除通知。本机演练在临时 Redis 实例上停服，并核对 readiness 503、liveness 200、告警入箱、Redis 重启、会员数据可用及恢复通知入箱。

数据库跨主机连接应配置受信证书和带 `sslMode=VERIFY_IDENTITY` 的 `FITBITE_JDBC_URL`，Redis 配置对应部署的 TLS 与认证。默认 Compose 绑定 API 到 127.0.0.1，并对内置 MySQL 强制加密传输。公开接入需配置由部署方控制的域名和 HTTPS 入口。

## 公开发布前的外部验收

将签名后的 Android/iOS 安装包分别安装到目标系统设备，完成升级登录、相机授权与拒绝、照片选择、通知和账号注销。对公网 HTTPS、真实 SMTP 投递、生产第三方 AI、用户数据保留与删除政策、监控收件人及应用商店隐私披露分别保留验收结果。公开注销页面的站点地址由发布方在商店登记。应用内注册账号的删除要求可参阅 [Apple 指引](https://developer.apple.com/support/offering-account-deletion-in-your-app/) 和 [Google Play 用户数据要求](https://support.google.com/googleplay/android-developer/answer/10144311)。
