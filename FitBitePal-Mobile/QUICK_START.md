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

### 第二步：修改配置文件

打开文件 `src/api/config.js`，找到第 20 行左右：

```javascript
// ┌────────────────────────────────────────────────────────────┐
// │ ⬇️ 把这里的 IP 改成你自己电脑的 IP 地址 ⬇️                    │
// └────────────────────────────────────────────────────────────┘
const YOUR_COMPUTER_IP = '192.168.10.5';  // <-- 改这里！
```

把 `192.168.10.5` 改成你自己的 IP 地址。

---

### 第三步：启动后端

```bash
cd FitBitePal-Backend
mvn spring-boot:run

# 或者使用 Docker
cd ..
docker-compose up -d
```

确保后端运行在 http://你的IP:8080

---

### 第四步：启动移动端开发服务器

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

| 需要修改的文件 | 修改内容 |
|---------------|---------|
| `src/api/config.js` | 第 20 行的 `YOUR_COMPUTER_IP` |

就这一个地方！其他都不用改。

---

## 🔗 相关链接

- 后端管理后台: http://你的IP:8080/api/admin/
- API 文档: http://你的IP:8080/api/swagger-ui.html

