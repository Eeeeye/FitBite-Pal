# 📝 开发环境配置说明

## ✅ 已创建 `application-dev.yml`

配置文件已创建，QQ邮箱授权码已填入。

---

## ⚠️ 需要修改的地方

打开 `application-dev.yml`，找到以下两处：

### 1. 第20行 - 邮箱用户名
```yaml
username: your-qq-number@qq.com  # ⚠️ TODO: 修改为您的QQ邮箱
```
**修改为**：
```yaml
username: 您的QQ号@qq.com  # 例如: 123456789@qq.com
```

### 2. 第40行 - 发件人地址
```yaml
from: your-qq-number@qq.com  # ⚠️ TODO: 修改为您的QQ邮箱
```
**修改为**：
```yaml
from: 您的QQ号@qq.com  # 例如: 123456789@qq.com
```

---

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

启动后，查看日志应该看到：

```
✅ 邮件服务配置成功
   Host: smtp.qq.com
   Port: 587
   Username: 您的QQ邮箱@qq.com
```

如果看到这些信息，说明配置成功！

---

## 🎯 配置文件包含的内容

- ✅ QQ邮箱SMTP配置（端口587）
- ✅ QQ邮箱授权码已填入
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


