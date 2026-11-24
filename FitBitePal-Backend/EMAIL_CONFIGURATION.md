# 找回密码邮件

后端使用 MySQL 查找注册邮箱，用 Redis 保存短期验证码。开发时邮件进入 Mailpit 本地收件箱；对外投递使用已授权的 SMTP 发件账号。

## 本地收件

在仓库根目录按 [README](../README.md) 配置数据库密码和 JWT 签名密钥，然后启动开发栈。

```sh
docker compose -f docker-compose.yml -f compose.mailpit.yml up -d --build
docker compose -f docker-compose.yml -f compose.mailpit.yml port mailpit 8025
```

第二条命令显示收件箱映射到的主机地址。默认是 `http://127.0.0.1:8025`。宿主机上的 SMTP 端口默认为 1025，Compose 中的后端通过容器网络访问 `mailpit:1025`。可用 `FITBITE_INBOX_PORT` 和 `FITBITE_SMTP_PORT` 调整映射，两个主机端口都绑定到回环地址。

直接在宿主机运行后端时，先启动 MySQL、Redis 和 Mailpit，设置应用的数据库连接参数，再运行以下命令。默认和 `dev` 配置都会启用 `localmail`，连接本机的 Mailpit。宿主机 SMTP 使用自定义端口时，通过 `FITBITE_MAILPIT_PORT` 传入实际端口。

```sh
cd FitBitePal-Backend
mvn spring-boot:run
```

## 真实邮箱投递

准备供应商提供的 **SMTP STARTTLS 提交端点**，通常使用 587 端口。后端使用 SMTP 身份验证，要求 STARTTLS 并校验服务器证书主机名。填写供应商允许使用的发件地址和相应的 SMTP 授权凭据。

| 变量 | 配置值 |
|---|---|
| `MAIL_HOST` | 供应商标明支持 STARTTLS 的 SMTP 主机 |
| `MAIL_PORT` | 该主机的 STARTTLS 提交端口，默认 587 |
| `MAIL_USERNAME` | SMTP 认证账号 |
| `MAIL_PASSWORD` | 供应商签发的 SMTP 凭据或应用专用密码 |
| `MAIL_FROM` | 供应商已验证并允许该账号使用的发件地址 |

将这五项填入部署环境的密钥配置，或本机被 Git 忽略的 `.env`。使用 Compose 时单独指定主文件，重新创建后端容器使配置生效。

```sh
docker compose -f docker-compose.yml up -d --build --force-recreate backend
```

宿主机直接启动时，将五项值注入当前进程环境，并显式选择供应商配置。已有生产部署可以使用配置完整的 `prod` profile。

```sh
cd FitBitePal-Backend
SPRING_PROFILES_ACTIVE=provider mvn spring-boot:run
```

## 验收一次找回密码

1. 在 App 注册一个测试用户。本地收件可用虚拟地址 `alex@example.test`；真实投递需要自己能够收信的地址。
2. 在登录页进入“忘记密码”，输入该用户的注册邮箱，点击发送验证码。服务端对已注册和未注册邮箱返回相同的提交成功消息。
3. 打开本地 Mailpit 或测试用户的邮箱，读取六位数字并在 App 输入。预校验通过后设置新密码，再用新密码登录。
4. 如果没有收到邮件，先检查是否启用了期望的 profile、Redis 是否可访问，再检查发件账号授权、STARTTLS 端口和 SMTP 返回的错误。验证码发送成功取决于邮件传输和有效收件地址。

| 步骤 | 接口 | 请求字段 |
|---|---|---|
| 发送 | `POST /api/auth/send-reset-code` | `email` |
| 预校验 | `POST /api/auth/verify-code` | `email`、`code` |
| 重置 | `POST /api/auth/reset-password` | `email`、`code`、`newPassword` |

默认有效期为五分钟，可用 `VERIFICATION_CODE_TTL_MINUTES` 配置。每个已注册邮箱在 60 秒内最多签发一次，在这 60 秒内重试会保留已发验证码。预校验与重置共用五次错误额度，成功预校验保留验证码，最终重置时原子消费一次。
