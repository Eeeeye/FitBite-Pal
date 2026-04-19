# FitBitePal 使用说明文档

> **版本**: 1.0.0  
> **更新日期**: 2025年11月  
> **项目简介**: FitBitePal 是一款"个性化健身训练 + 饮食管理"的一体化移动应用

---

## 目录

1. [系统概述](#1-系统概述)
2. [环境要求](#2-环境要求)
3. [部署指南](#3-部署指南)
4. [移动端用户使用说明](#4-移动端用户使用说明)
5. [管理端使用说明](#5-管理端使用说明)
6. [API 接口文档](#6-api-接口文档)
7. [常见问题](#7-常见问题)

---

## 1. 系统概述

### 1.1 功能特性

FitBitePal 提供以下核心功能：

| 功能模块 | 描述 |
|---------|------|
| 🏋️ **个性化训练计划** | 根据用户年龄、体重、目标、可用时间自动生成训练计划 |
| 🎯 **实时姿态识别** | 训练时检测动作姿态并提供实时纠错反馈 |
| 🍎 **饮食管理** | 拍照识别食物并估算热量与营养素 |
| 📊 **数据报表** | 体重变化曲线、训练打卡日历、热量统计 |
| ✅ **打卡系统** | 每日训练与饮食打卡记录 |
| 🌐 **多语言支持** | 支持中文/英文界面切换 |

### 1.2 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    移动端 (React Native)                      │
│  iOS / Android App                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (HTTPS)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   后端服务 (Spring Boot)                      │
│  • 用户认证 (JWT)        • 训练计划生成                        │
│  • 饮食计划管理          • 数据统计                            │
│  • AI 集成接口           • 管理后台 API                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     ┌──────────┐   ┌──────────┐   ┌──────────────┐
     │  MySQL   │   │  Redis   │   │  Ark AI      │
     │  数据库  │   │   缓存   │   │   AI 服务    │
     └──────────┘   └──────────┘   └──────────────┘
```

---

## 2. 环境要求

### 2.1 服务器环境

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Java | JDK 17+ | Spring Boot 运行环境 |
| MySQL | 8.0+ | 数据存储 |
| Redis | 7.0+ | 缓存与会话管理 |
| Maven | 3.8+ | Java 项目构建 |
| Node.js | 18+ | 移动端开发环境 |

### 2.2 移动端兼容性

| 平台 | 最低版本 | 推荐版本 |
|------|---------|---------|
| iOS | 15.0+ | 16.0+ |
| Android | API 28 (Android 9) | API 33 (Android 13) |

### 2.3 开发环境

```bash
# 检查环境版本
java -version       # 应显示 17+
node -v             # 应显示 18+
npm -v              # 应显示 9+
mysql --version     # 应显示 8.0+
redis-server -v     # 应显示 7.0+
```

---

## 3. 部署指南

### 3.1 方式一：Docker Compose 快速部署（推荐）

#### 步骤 1：准备环境变量

```bash
# 在项目根目录创建 .env 文件
cp env.docker.example .env

# 编辑 .env 文件，配置以下关键参数
vim .env
```

**.env 文件内容：**

```env
# 数据库配置
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=fitbitepal

# JWT 密钥（生产环境必须修改）
JWT_SECRET=Your-Super-Secret-Key-Min-256-Bits-Production

# 邮件服务配置
MAIL_HOST=smtp.qq.com
MAIL_PORT=587
MAIL_USERNAME=your_email@qq.com
MAIL_PASSWORD=your_email_password

# AI 服务配置（可选）
ARK_API_KEY=your_ark_api_key
ARK_MODEL=doubao-seed-2.0-pro
ARK_ENABLED=true
```

#### 步骤 2：启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
```

#### 步骤 3：验证部署

```bash
# 检查后端健康状态
curl http://localhost:8080/api/actuator/health

# 预期返回
{"status":"UP"}
```

---

### 3.2 方式二：手动部署

#### 3.2.1 数据库配置

```sql
-- 登录 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE fitbitepal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户并授权（可选）
CREATE USER 'fitbitepal'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON fitbitepal.* TO 'fitbitepal'@'%';
FLUSH PRIVILEGES;
```

#### 3.2.2 Redis 配置

```bash
# 启动 Redis 服务
redis-server

# 验证 Redis 运行
redis-cli ping
# 应返回: PONG
```

#### 3.2.3 后端部署

```bash
# 进入后端目录
cd FitBitePal-Backend

# 修改配置文件
vim src/main/resources/application.yml

# 关键配置项：
# - spring.datasource.url: MySQL 连接地址
# - spring.datasource.password: MySQL 密码
# - spring.data.redis.host: Redis 地址
# - jwt.secret: JWT 密钥（生产环境必须修改）

# 构建项目
mvn clean package -DskipTests

# 启动服务
java -jar target/fitbitepal-backend-0.0.1-SNAPSHOT.jar

# 或后台运行
nohup java -jar target/fitbitepal-backend-0.0.1-SNAPSHOT.jar > app.log 2>&1 &
```

#### 3.2.4 移动端开发与构建

```bash
# 进入移动端目录
cd FitBitePal-Mobile

# 安装依赖
npm install

# 配置服务器地址
vim services/serverConfig.js
# 修改 API_BASE_URL 为后端服务器地址

# 开发模式运行
npm start

# 构建 Android APK
npm run build:preview

# 构建生产版本
npm run build:prod
```

---

### 3.3 生产环境配置建议

#### 安全配置

```yaml
# application-prod.yml
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # 生产环境禁止自动修改表结构
    show-sql: false

jwt:
  secret: ${JWT_SECRET}  # 使用环境变量
  expiration: 3600000    # 缩短 token 有效期

cors:
  allowed-origins:
    - https://your-domain.com  # 仅允许指定域名
```

#### Nginx 反向代理配置

```nginx
server {
    listen 443 ssl;
    server_name api.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. 移动端用户使用说明

### 4.1 注册与登录

#### 新用户注册

1. 打开应用，点击 **"注册"**
2. 输入邮箱地址和密码
3. 点击 **"获取验证码"**，查收邮件
4. 输入验证码完成注册

#### 用户登录

1. 输入注册的邮箱/用户名
2. 输入密码
3. 点击 **"登录"**

#### 忘记密码

1. 点击登录页的 **"忘记密码?"**
2. 输入注册邮箱
3. 接收重置链接，设置新密码

---

### 4.2 新手向导（首次使用）

首次登录后，系统会引导您完成个人资料设置：

| 步骤 | 内容 | 说明 |
|------|------|------|
| 1 | 性别选择 | 男/女 |
| 2 | 年龄设置 | 用于计算基础代谢 |
| 3 | 身高输入 | 单位：厘米 |
| 4 | 体重输入 | 单位：公斤 |
| 5 | 健身目标 | 减脂/增肌/保持健康 |
| 6 | 每日训练时长 | 15/30/45/60 分钟 |
| 7 | 活动水平 | 久坐/轻度活动/中度活动/重度活动 |

完成设置后，系统将自动生成个性化训练和饮食计划。

---

### 4.3 首页功能

首页展示今日训练和饮食计划概览：

```
┌─────────────────────────────────────┐
│  👋 你好，用户名                      │
│  今日目标：燃烧 500 kcal              │
├─────────────────────────────────────┤
│  📅 今日训练计划                      │
│  ├─ 训练时长: 30 分钟                 │
│  ├─ 训练强度: 中级                    │
│  └─ 训练部位: 上肢                    │
│                                      │
│  🏋️ 训练内容:                        │
│  • 俯卧撑 × 3组 × 12次               │
│  • 哑铃飞鸟 × 3组 × 10次             │
│  • 平板支撑 × 3组 × 30秒             │
├─────────────────────────────────────┤
│  🍽️ 今日饮食计划                     │
│  • 早餐: 燕麦粥配蓝莓 (280 kcal)     │
│  • 午餐: 鸡胸肉沙拉 (450 kcal)       │
│  • 晚餐: 清蒸鱼配青菜 (380 kcal)     │
├─────────────────────────────────────┤
│  ✅ 打卡          📊 统计            │
└─────────────────────────────────────┘
```

#### 调整训练计划

1. 点击首页 **"调整计划"** 按钮
2. 选择训练时长（15-60分钟）
3. 选择训练强度（初级/中级/高级）
4. 选择训练部位（上肢/下肢/核心/全身）
5. 点击 **"保存"**，系统重新生成计划

---

### 4.4 训练功能

#### 开始训练

1. 在首页点击训练卡片，进入训练详情
2. 点击具体动作查看动作演示（GIF动图）
3. 点击 **"开始训练"** 进入实时训练模式

#### 实时姿态识别

1. 允许应用访问摄像头
2. 将手机放置在可拍摄全身的位置
3. 开始做动作，系统实时检测姿态
4. 收到纠错提示时调整动作

**姿态识别提示示例：**
- ⚠️ 膝盖内扣，请保持膝盖与脚尖方向一致
- ⚠️ 深蹲时膝盖超过脚尖，请后移重心
- ✅ 动作标准，保持！

#### 完成训练

- 每完成一个动作，勾选 ✓ 标记完成
- 所有动作完成后，点击 **"完成训练"**
- 系统自动记录训练数据

---

### 4.5 饮食功能

#### 查看饮食计划

1. 点击底部导航 **"饮食"** 进入饮食页面
2. 查看今日早/中/晚餐推荐

#### 拍照识别食物

1. 点击 **"拍照识别"** 按钮
2. 拍摄食物照片
3. 系统自动识别食物类型
4. 查看估算的热量和营养成分
5. 确认或手动修正后保存

#### 手动记录饮食

1. 点击 **"手动添加"**
2. 搜索或选择食物
3. 输入份量
4. 保存记录

---

### 4.6 打卡与统计

#### 每日打卡

1. 点击首页 **"打卡"** 按钮
2. 输入今日体重（可选）
3. 确认打卡

#### 查看统计

进入 **"统计"** 页面查看：

- **体重变化曲线**：7天/30天/90天体重趋势
- **训练日历**：本月训练打卡记录
- **热量统计**：每日摄入/消耗热量对比
- **营养占比**：蛋白质/碳水/脂肪比例

---

### 4.7 个人设置

在 **"我的"** 页面可以：

- 修改个人资料（身高、体重、目标等）
- 切换语言（中文/英文）
- 设置训练提醒
- 查看历史记录
- 退出登录

---

## 5. 管理端使用说明

### 5.1 访问管理后台

管理后台集成在移动端应用中，仅对管理员角色可见。

**设置管理员账户：**

```sql
-- 在 MySQL 中执行
UPDATE users SET role = 'ADMIN' WHERE username = 'admin_username';
```

管理员登录后，底部导航会显示 **"管理"** 入口。

---

### 5.2 仪表盘

管理首页展示系统概览：

| 指标 | 说明 |
|------|------|
| 用户总数 | 注册用户数量 |
| 今日打卡 | 今日完成打卡的用户数 |
| 食品库数量 | 启用的食品数量 |
| 套餐数量 | 启用的套餐数量 |

---

### 5.3 用户管理

#### 查看用户列表

1. 进入 **"用户管理"**
2. 浏览用户列表（分页显示）
3. 点击用户查看详情

#### 用户详情

- 基本信息：用户名、邮箱、注册时间
- 身体数据：身高、体重、年龄、目标
- 今日计划：训练计划、饮食计划
- 打卡历史：最近10次打卡记录

#### 管理操作

| 操作 | 说明 |
|------|------|
| 修改角色 | 将用户设为 USER 或 ADMIN |
| 删除用户 | 删除用户及其所有关联数据 |

⚠️ **警告**：删除用户将同时删除其训练计划、饮食计划、打卡记录等所有数据，此操作不可恢复。

---

### 5.4 食品库管理

#### 查看食品列表

1. 进入 **"食品库管理"**
2. 使用分类筛选器过滤（主食/蔬菜/水果/肉类等）
3. 下拉刷新获取最新数据

#### 添加食品

点击 **"+ 添加"** 按钮，填写：

| 字段 | 说明 | 必填 |
|------|------|------|
| 食品名称（中文） | 如：白米饭 | ✅ |
| 食品名称（英文） | 如：White Rice | |
| 分类 | 主食/蔬菜/水果/肉类/海鲜/蛋奶/饮品/其他 | ✅ |
| 热量 | 每100g热量（kcal） | |
| 蛋白质 | 每100g蛋白质含量（g） | |
| 碳水化合物 | 每100g碳水含量（g） | |
| 脂肪 | 每100g脂肪含量（g） | |
| 识别关键词 | 用于AI识别，逗号分隔 | |

#### 编辑/删除食品

- **编辑**：点击食品卡片的 **"编辑"** 按钮
- **删除**：点击 **"删除"** 按钮（软删除，不会真正删除数据）

---

### 5.5 套餐管理

#### 查看套餐列表

1. 进入 **"套餐管理"**
2. 使用筛选器按目标（减脂/增肌/健康）和餐次（早/中/晚）过滤

#### 添加套餐

点击 **"+ 添加"** 按钮，填写：

| 字段 | 说明 | 必填 |
|------|------|------|
| 套餐名称（中文） | 如：燕麦粥配蓝莓 | ✅ |
| 套餐名称（英文） | 如：Oatmeal with Blueberries | ✅ |
| 适用目标 | 减脂/增肌/健康 | ✅ |
| 餐次 | 早餐/午餐/晚餐 | ✅ |
| 食材配方（中文） | JSON格式，如：[{"name":"燕麦","amount":"50g"}] | |
| 食材配方（英文） | JSON格式 | |
| 热量/蛋白质/碳水/脂肪 | 营养成分 | |

#### 编辑/删除套餐

- **编辑**：修改套餐信息
- **删除**：软删除套餐（不影响已生成的饮食计划）

---

### 5.6 系统配置

#### 配置项说明

| 配置键 | 说明 | 默认值 |
|--------|------|--------|
| app.name | 应用名称 | FitBitePal |
| app.version | 应用版本 | 1.0.0 |
| app.maintenance.mode | 维护模式开关 | false |
| cache.user.ttl.hours | 用户缓存过期时间 | 24 |
| cache.plan.ttl.hours | 计划缓存过期时间 | 12 |
| notification.daily.reminder | 每日打卡提醒 | true |
| notification.reminder.time | 提醒时间 | 08:00 |
| display.default.language | 默认语言 | zh |
| display.theme | 默认主题 | dark |

#### 修改配置

1. 点击配置项的 **"编辑"** 按钮
2. 修改配置值
3. 保存后立即生效（部分配置可能需要重启服务）

#### 初始化默认配置

点击 **"初始化默认配置"** 按钮，系统将创建所有默认配置项（不会覆盖已存在的配置）。

---

## 6. API 接口文档

### 6.1 接口基础信息

- **Base URL**: `http://your-server:8080/api`
- **认证方式**: JWT Bearer Token
- **请求格式**: JSON
- **响应格式**: 
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": { ... }
  }
  ```

### 6.2 主要接口列表

#### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/register | 用户注册 |
| POST | /auth/login | 用户登录 |
| POST | /auth/forgot-password | 忘记密码 |
| POST | /auth/reset-password | 重置密码 |
| POST | /auth/send-verification | 发送验证码 |

#### 用户接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /users/{userId} | 获取用户信息 |
| POST | /users/{userId}/profile | 保存用户资料 |
| GET | /users/{userId}/training-plan | 获取训练计划 |
| GET | /users/{userId}/diet-plan | 获取饮食计划 |
| POST | /users/{userId}/adjust-plan | 调整训练计划 |
| POST | /users/{userId}/check-in | 用户打卡 |

#### 数据统计接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /data/weight | 获取体重记录 |
| GET | /data/calories | 获取热量记录 |
| GET | /data/statistics | 获取综合统计 |

#### 管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/dashboard | 仪表盘数据 |
| GET | /admin/users | 用户列表 |
| DELETE | /admin/users/{userId} | 删除用户 |
| GET | /admin/foods | 食品列表 |
| POST | /admin/foods | 添加食品 |
| PUT | /admin/foods/{foodId} | 更新食品 |
| DELETE | /admin/foods/{foodId} | 删除食品 |
| GET | /admin/meal-sets | 套餐列表 |
| POST | /admin/meal-sets | 添加套餐 |
| PUT | /admin/meal-sets/{id} | 更新套餐 |
| DELETE | /admin/meal-sets/{id} | 删除套餐 |
| GET | /admin/configs | 系统配置列表 |
| POST | /admin/configs | 保存配置 |

---

## 7. 常见问题

### Q1: 无法连接到服务器

**可能原因：**
- 后端服务未启动
- 移动端配置的服务器地址错误
- 防火墙阻止了端口 8080

**解决方案：**
1. 确认后端服务正常运行：`curl http://localhost:8080/api/actuator/health`
2. 检查移动端 `serverConfig.js` 中的 API 地址
3. 开放防火墙端口：`firewall-cmd --add-port=8080/tcp --permanent`

---

### Q2: 登录时提示"密码错误"

**解决方案：**
1. 确认输入的账号/邮箱正确
2. 尝试使用"忘记密码"功能重置
3. 检查数据库中用户记录是否存在

---

### Q3: 训练计划没有刷新

**可能原因：**
- 缓存未清除
- 前端状态未更新

**解决方案：**
1. 下拉刷新页面
2. 重新登录应用
3. 清除应用缓存后重试

---

### Q4: 姿态识别不准确

**可能原因：**
- 光线不足
- 摄像头角度不佳
- 距离过远或过近

**解决方案：**
1. 确保环境光线充足
2. 将手机放置在可拍摄全身的位置
3. 保持与摄像头 1.5-3 米的距离
4. 穿着与背景颜色对比明显的服装

---

### Q5: 邮件验证码收不到

**可能原因：**
- 邮件服务配置错误
- 邮件被归类为垃圾邮件
- 邮箱地址错误

**解决方案：**
1. 检查垃圾邮件文件夹
2. 确认邮箱地址输入正确
3. 检查后端邮件配置：
   ```yaml
   spring:
     mail:
       host: smtp.qq.com
       port: 587
       username: your_email@qq.com
       password: your_auth_code  # QQ邮箱需使用授权码
   ```

---

### Q6: Docker 部署时数据库连接失败

**解决方案：**
1. 确认 MySQL 容器已启动：`docker-compose ps`
2. 等待 MySQL 完全启动（约30秒）
3. 检查数据库连接配置是否正确
4. 查看后端日志：`docker-compose logs backend`

---

## 附录

### A. 技术栈清单

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端 | React Native | 0.81 |
| 前端 | Expo | 54.0 |
| 后端 | Spring Boot | 3.x |
| 数据库 | MySQL | 8.0 |
| 缓存 | Redis | 7.0 |
| AI | 火山方舟 | - |

### B. 联系支持

如有问题，请联系技术支持或提交 Issue。

---

**© 2025 FitBitePal Team. All Rights Reserved.**

