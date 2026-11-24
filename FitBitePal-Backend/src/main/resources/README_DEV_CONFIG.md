# 📝 开发环境配置说明

## ✅ 已创建 `application-dev.yml`

配置文件已创建，从环境变量 `MAIL_USERNAME` 和 `MAIL_PASSWORD` 读取发件账号和 SMTP 授权码。

---

## 配置开发邮箱

在启动后端的终端或 IDE 运行配置中设置 `MAIL_USERNAME` 和 `MAIL_PASSWORD`。前者是邮箱账号，后者是服务商签发的 SMTP 授权码。需要指定不同的发件地址时，设置 `MAIL_FROM`。

## 🚀 使用配置文件启动

修改完成后，使用以下命令启动：

```bash
# 方法1: 指定profile启动
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 方法2: 设置环境变量后启动
# Windows PowerShell
$env:SPRING_PROFILES_ACTIVE="dev"
mvn spring-boot:run

# Linux/macOS
export SPRING_PROFILES_ACTIVE=dev
mvn spring-boot:run
```

---

## ✅ 验证配置

启动前配置 `MAIL_USERNAME` 和 `MAIL_PASSWORD`。通过应用的找回密码页面发送验证码，再用测试邮箱核对是否收到邮件。

---

## 🎯 配置文件包含的内容

- ✅ QQ邮箱SMTP配置（端口587）
- ✅ 从环境变量 `MAIL_USERNAME` 和 `MAIL_PASSWORD` 读取发件账号和 SMTP 授权码
- ✅ SMTP认证和STARTTLS配置
- ✅ 数据库配置（继承主配置）
- ✅ Redis配置（继承主配置）
- ✅ AI服务配置
- ✅ 开发环境日志配置
- ✅ 邮件调试日志已开启

---

## 🐛 调试技巧

如果邮件发送失败，查看日志中的详细错误：

```
logging:
  level:
    org.springframework.mail: DEBUG  # 已开启邮件调试
```

这会显示SMTP连接和认证的详细过程。

---

**下一步**：修改配置文件中的QQ邮箱地址，然后启动测试！


