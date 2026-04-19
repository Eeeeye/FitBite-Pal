# 🚀 FitBite Pal 移动端 - 快速开始指南

## 📋 配置步骤（3 分钟搞定）

### 第一步：获取你电脑的 IP 地址

**Windows:**
```bash
# 打开 CMD 或 PowerShell，输入：
ipconfig

# 找到类似这样的行：
# IPv4 地址 . . . . . . . . . . . . : 192.168.10.5
#                                      ↑ 这就是你的 IP
```

**Mac/Linux:**
```bash
ifconfig | grep "inet "
# 或
ip addr show
```

---

### 第二步：启动后端

```bash
cd FitBitePal-Backend
mvn spring-boot:run

# 或者使用 Docker
cd ..
docker-compose up -d
```

确保后端运行在 http://你的IP:8080

---

### 第三步：启动移动端开发服务器

```bash
cd FitBitePal-Mobile

# 安装依赖（首次运行）
npm install

# 启动
npx expo start
```

---

### 第五步：在手机上测试

1. 手机连接和电脑 **同一个 WiFi**
2. 安装 Expo Go 应用（App Store / Google Play）
3. 扫描终端显示的二维码

---

### 第四步：在 App 启动页配置服务器地址

当前项目优先使用应用内服务器配置，不需要先手改代码里的 IP。

1. 打开 App 启动页右上角 `⚙️`
2. 选择 `IP + 端口`
3. 输入你电脑的局域网 IP 和端口 `8080`
4. 点击“测试连接”
5. 连接成功后点击“保存配置”
6. 按提示重启 App

如果你使用的是内网穿透地址或完整域名：

1. 在启动页右上角 `⚙️` 里切换到 `自定义 URL`
2. 输入完整地址，例如 `https://xxxx.ngrok-free.app`
3. 点击“测试连接”并保存

应用会自动补上 `/api`，所以通常不用手动写 `/api` 后缀。

---

### 第五步：录制前清理状态

为了从注册流程开始录制，建议先清掉旧登录状态：

- 如果 App 里仍停留在已登录页面，先退出登录
- 如果缓存状态异常，直接卸载 App 后重新安装
- 重新打开后，确认能回到 Splash / Login / Register 流程

---

## 📦 构建 APK

```bash
# 登录 Expo（首次需要）
npx expo login

# 初始化项目（首次需要）
eas init

# 构建 APK
eas build -p android --profile preview
```

---

## ⚠️ 常见问题

### Q: 手机连不上后端？

检查清单：
- [ ] 手机和电脑在同一 WiFi（不能用 4G）
- [ ] IP 地址配置正确
- [ ] 后端服务正在运行
- [ ] 防火墙允许 8080 端口

**Windows 防火墙设置：**
```bash
# 管理员 PowerShell 运行：
New-NetFirewallRule -DisplayName "FitBitePal Backend" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

### Q: 如何查看后端是否运行？

在浏览器访问：`http://你的IP:8080/api/actuator/health`

应该看到：`{"status":"UP"}`

---

## 📱 配置总结

- 后端启动在 `http://你的IP:8080`
- 手机和电脑在同一个 WiFi
- App 内通过启动页右上角 `⚙️` 配置服务器地址
- 录制前清理旧登录状态，确保能从新用户流程开始

---

## 🔗 相关链接

- 后端管理后台: http://你的IP:8080/api/admin/
- API 文档: http://你的IP:8080/api/swagger-ui.html

