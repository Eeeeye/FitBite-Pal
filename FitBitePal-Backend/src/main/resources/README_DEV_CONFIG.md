# 开发环境配置

在 `FitBitePal-Backend` 目录运行以下命令可启用开发日志和本地 Mailpit 邮箱。

```sh
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

启动前运行 MySQL、Redis 和 Mailpit。数据库通过 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD` 配置，Redis 通过 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD` 配置。需要 AI 功能时设置 `ARK_API_KEY`。

`dev` 自动激活 `localmail`。默认 SMTP 为 `127.0.0.1:1025`，本地收件箱为 [Mailpit](http://127.0.0.1:8025)。在 App 注册一个测试邮箱后，通过登录页的“忘记密码”发送验证码，即可在收件箱看到邮件。

使用 Compose 启动整套开发环境，或配置通过 STARTTLS 投递到真实邮箱，请按[邮件配置指南](../../../EMAIL_CONFIGURATION.md)选择对应的启动方式。
