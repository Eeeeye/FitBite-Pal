# 📧 邮箱验证功能配置指南

## 📋 概述

FitBitePal的找回密码功能需要配置邮件服务（SMTP）和Redis来发送和验证邮箱验证码。

---

## ✅ 前置条件

### 1. Redis（必需）
验证码需要存储在Redis中，有效期5分钟。

**安装Redis**:
```bash
# Windows (使用WSL或下载Windows版本)
# https://redis.io/download

# macOS
brew install redis
brew services start redis

# Linux (Ubuntu/Debian)
sudo apt-get install redis-server
sudo systemctl start redis
```

**验证Redis运行**:
```bash
redis-cli ping
# 应该返回: PONG
```

---

## 🔧 邮件服务配置（三选一）

### 选项1: Gmail（推荐用于测试）

#### 步骤1: 开启两步验证
1. 访问 https://myaccount.google.com/security
2. 开启"两步验证"

#### 步骤2: 生成应用专用密码
1. 访问 https://myaccount.google.com/apppasswords
2. 选择"邮件"和"其他（自定义名称）"
3. 输入"FitBitePal"
4. 复制生成的16位密码（格式：xxxx xxxx xxxx xxxx）

#### 步骤3: 配置环境变量
```bash
# Windows PowerShell
$env:MAIL_HOST="smtp.gmail.com"
$env:MAIL_PORT="587"
$env:MAIL_USERNAME="your-email@gmail.com"
$env:MAIL_PASSWORD="your-app-password"  # 16位应用专用密码（去掉空格）
$env:MAIL_FROM="your-email@gmail.com"

# Linux/macOS
export MAIL_HOST=smtp.gmail.com
export MAIL_PORT=587
export MAIL_USERNAME=your-email@gmail.com
export MAIL_PASSWORD=your-app-password
export MAIL_FROM=your-email@gmail.com
```

---

### 选项2: QQ邮箱（推荐国内用户）

#### 步骤1: 开启SMTP服务
1. 登录QQ邮箱 https://mail.qq.com
2. 点击"设置" → "账户"
3. 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"
4. 开启"POP3/SMTP服务"或"IMAP/SMTP服务"
5. 点击"生成授权码"，会收到一条短信
6. 记录生成的**授权码**（16位）

#### 步骤2: 配置环境变量
```bash
# Windows PowerShell
$env:MAIL_HOST="smtp.qq.com"
$env:MAIL_PORT="587"
$env:MAIL_USERNAME="your-qq-number@qq.com"
$env:MAIL_PASSWORD="your-authorization-code"  # QQ邮箱授权码
$env:MAIL_FROM="your-qq-number@qq.com"

# Linux/macOS
export MAIL_HOST=smtp.qq.com
export MAIL_PORT=587
export MAIL_USERNAME=your-qq-number@qq.com
export MAIL_PASSWORD=your-authorization-code
export MAIL_FROM=your-qq-number@qq.com
```

---

### 选项3: 163网易邮箱

#### 步骤1: 开启SMTP服务
1. 登录163邮箱 https://mail.163.com
2. 点击"设置" → "POP3/SMTP/IMAP"
3. 开启"IMAP/SMTP服务"
4. 设置**客户端授权密码**
5. 记录这个密码

#### 步骤2: 配置环境变量
```bash
# Windows PowerShell
$env:MAIL_HOST="smtp.163.com"
$env:MAIL_PORT="465"  # 163使用SSL端口465
$env:MAIL_USERNAME="your-email@163.com"
$env:MAIL_PASSWORD="your-authorization-password"
$env:MAIL_FROM="your-email@163.com"

# Linux/macOS
export MAIL_HOST=smtp.163.com
export MAIL_PORT=465
export MAIL_USERNAME=your-email@163.com
export MAIL_PASSWORD=your-authorization-password
export MAIL_FROM=your-email@163.com
```

---

## 🚀 启动后端服务

### 方法1: 使用环境变量
```bash
# 1. 设置所有环境变量（见上方）

# 2. 启动后端
cd FitBitePal-Backend
mvn spring-boot:run
```

### 方法2: 使用配置文件（推荐）

创建 `FitBitePal-Backend/src/main/resources/application-dev.yml`:
```yaml
spring:
  mail:
    host: smtp.gmail.com  # 或 smtp.qq.com / smtp.163.com
    port: 587
    username: your-email@gmail.com
    password: your-app-password
    protocol: smtp
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
            required: true

app:
  security:
    mail:
      from: your-email@gmail.com
```

然后启动：
```bash
mvn spring-boot:run --spring.profiles.active=dev
```

---

## 🧪 测试邮件功能

### 1. 启动服务
确保Redis和后端都已启动：
```bash
# 终端1: 启动Redis（如果未运行）
redis-server

# 终端2: 启动后端
cd FitBitePal-Backend
mvn spring-boot:run
```

### 2. 查看日志
后端启动时应该看到：
```
✅ 邮件服务配置成功
   Host: smtp.gmail.com
   Port: 587
   Username: your-email@gmail.com
```

### 3. 在应用中测试
1. 打开FitBitePal应用
2. 点击"忘记密码"
3. 输入邮箱地址（使用您配置的邮箱）
4. 点击"发送验证码"
5. 检查邮箱收件箱（可能在垃圾邮件中）

### 4. 查看后端日志
发送成功时会看到：
```
📧 验证码邮件已发送至 your-email@example.com
```

发送失败时会看到错误信息：
```
❌ 发送验证码邮件失败: Authentication failed
```

---

## ❌ 常见问题

### 问题1: "Authentication failed"（认证失败）

**原因**: 密码错误或未开启SMTP服务

**解决方案**:
- Gmail: 确保使用的是**应用专用密码**，不是Google账号密码
- QQ邮箱: 确保使用的是**授权码**，不是QQ密码
- 163邮箱: 确保使用的是**客户端授权密码**

### 问题2: "Connection refused"（连接被拒绝）

**原因**: SMTP端口或主机地址错误

**解决方案**:
- 检查`MAIL_HOST`和`MAIL_PORT`是否正确
- Gmail: `smtp.gmail.com:587`
- QQ邮箱: `smtp.qq.com:587`
- 163邮箱: `smtp.163.com:465`

### 问题3: "Could not connect to Redis"

**原因**: Redis服务未启动

**解决方案**:
```bash
# 启动Redis
redis-server

# 或使用Docker
docker run -d -p 6379:6379 redis:alpine
```

### 问题4: 收不到邮件

**解决方案**:
1. **检查垃圾邮件箱**：验证码邮件可能被标记为垃圾邮件
2. **检查后端日志**：确认"验证码邮件已发送"的日志
3. **等待1-2分钟**：有时邮件会延迟
4. **尝试重发**：点击"重新发送"按钮

---

## 📊 验证码配置

可以通过环境变量自定义验证码：

```bash
# 验证码长度（默认6位）
export VERIFICATION_CODE_LENGTH=6

# 验证码有效期（默认5分钟）
export VERIFICATION_CODE_TTL_MINUTES=5
```

---

## 🔒 生产环境配置

### 使用环境变量（推荐）
```bash
# 在服务器上设置环境变量
export MAIL_HOST=smtp.example.com
export MAIL_PORT=587
export MAIL_USERNAME=noreply@fitbitepal.com
export MAIL_PASSWORD=strong-password
export MAIL_FROM=noreply@fitbitepal.com

# 或使用Docker环境变量
docker run -d \
  -e MAIL_HOST=smtp.example.com \
  -e MAIL_PORT=587 \
  -e MAIL_USERNAME=noreply@fitbitepal.com \
  -e MAIL_PASSWORD=strong-password \
  -e MAIL_FROM=noreply@fitbitepal.com \
  fitbitepal-backend
```

### 安全建议
1. ✅ 使用专用的"noreply@"邮箱
2. ✅ 定期更换SMTP密码
3. ✅ 在生产环境使用HTTPS
4. ✅ 限制验证码发送频率（当前60秒）
5. ✅ 监控邮件发送失败率

---

## 📚 相关API

### 发送验证码
```http
POST /api/auth/send-verification-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**响应**:
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

### 验证验证码（重置密码）
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "new-secure-password"
}
```

---

## 💡 快速开始（推荐配置）

**如果您想快速测试，推荐使用Gmail**：

```bash
# 1. 开启Redis
redis-server

# 2. 配置Gmail（见上方步骤）
export MAIL_HOST=smtp.gmail.com
export MAIL_PORT=587
export MAIL_USERNAME=your-email@gmail.com
export MAIL_PASSWORD=your-app-password
export MAIL_FROM=your-email@gmail.com

# 3. 启动后端
cd FitBitePal-Backend
mvn spring-boot:run

# 4. 在应用中测试找回密码功能
```

---

## ✨ 当前状态

- ✅ **后端邮件服务已实现**
- ✅ **前端找回密码页面已国际化**
- ⏳ **需要配置SMTP服务器**
- ⏳ **需要Redis服务运行**

配置完成后即可使用完整的找回密码功能！

---

**更新日期**: 2025-11-19
**版本**: 1.0.0


