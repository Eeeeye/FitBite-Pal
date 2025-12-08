# VM 虚拟机 Docker 部署指南

本指南详细介绍如何在 VM 虚拟机中使用 Docker 部署 FitBitePal 后端服务。

---

## 目录

1. [准备工作](#1-准备工作)
2. [安装 Docker](#2-安装-docker)
3. [上传项目文件](#3-上传项目文件)
4. [配置环境变量](#4-配置环境变量)
5. [部署服务](#5-部署服务)
6. [验证部署](#6-验证部署)
7. [常用运维命令](#7-常用运维命令)
8. [故障排查](#8-故障排查)

---

## 1. 准备工作

### 1.1 VM 虚拟机要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| 操作系统 | Ubuntu 20.04 / CentOS 7 | Ubuntu 22.04 |
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 硬盘 | 20 GB | 50 GB |
| 网络 | 可访问外网 | 静态 IP |

### 1.2 开放端口

确保以下端口可访问：

| 端口 | 服务 | 说明 |
|------|------|------|
| 8080 | 后端 API | 必需 |
| 3306 | MySQL | 可选（仅内部访问） |
| 6379 | Redis | 可选（仅内部访问） |

---

## 2. 安装 Docker

### 2.1 Ubuntu 系统

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要依赖
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 软件源
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker 并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组（免 sudo）
sudo usermod -aG docker $USER

# 重新登录或执行以下命令使组权限生效
newgrp docker
```

### 2.2 CentOS 系统

```bash
# 安装必要依赖
sudo yum install -y yum-utils

# 添加 Docker 软件源
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker 并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
newgrp docker
```

### 2.3 验证安装

```bash
# 检查 Docker 版本
docker --version
# 输出示例: Docker version 24.0.7, build afdd53b

# 检查 Docker Compose 版本
docker compose version
# 输出示例: Docker Compose version v2.21.0

# 测试 Docker 运行
docker run hello-world
```

---

## 3. 上传项目文件

### 3.1 方式一：使用 SCP 上传（推荐）

在 **Windows 本地** 执行：

```powershell
# 创建部署包（在项目根目录执行）
cd E:\project1\软件app\移动端\1

# 压缩需要的文件
tar -czvf fitbitepal-deploy.tar.gz FitBitePal-Backend docker-compose.yml env.docker.example

# 上传到 VM（替换 user 和 ip）
scp fitbitepal-deploy.tar.gz user@your-vm-ip:/home/user/
```

在 **VM 虚拟机** 中执行：

```bash
# 进入用户目录
cd /home/user

# 解压文件
tar -xzvf fitbitepal-deploy.tar.gz

# 创建项目目录
mkdir -p /opt/fitbitepal
mv FitBitePal-Backend docker-compose.yml env.docker.example /opt/fitbitepal/

# 进入项目目录
cd /opt/fitbitepal
```

### 3.2 方式二：使用 Git 克隆

如果项目在 Git 仓库中：

```bash
# 安装 Git
sudo apt install -y git  # Ubuntu
# 或
sudo yum install -y git  # CentOS

# 克隆项目
cd /opt
git clone https://your-git-repo/fitbitepal.git
cd fitbitepal
```

### 3.3 方式三：使用 FileZilla（图形界面）

1. 下载并安装 FileZilla
2. 连接到 VM（使用 SFTP，端口 22）
3. 将项目文件拖拽上传到 `/opt/fitbitepal/`

---

## 4. 配置环境变量

### 4.1 创建 .env 文件

```bash
cd /opt/fitbitepal

# 从模板创建 .env 文件
cp env.docker.example .env

# 编辑配置
nano .env
```

### 4.2 修改配置内容

```env
# ========================================
# MySQL 数据库配置
# ========================================
MYSQL_ROOT_PASSWORD=FitBitePal2024!Secure    # 修改为强密码
MYSQL_DATABASE=fitbitepal
MYSQL_PORT=3306

# ========================================
# Redis 配置
# ========================================
REDIS_PORT=6379

# ========================================
# 后端服务配置
# ========================================
BACKEND_PORT=8080

# JWT 密钥（必须修改！至少32位随机字符串）
JWT_SECRET=YourSuperSecretJWTKey2024FitBitePalProductionMin256Bits
JWT_EXPIRATION=86400000

# ========================================
# 邮件服务配置
# ========================================
MAIL_HOST=smtp.qq.com
MAIL_PORT=587
MAIL_USERNAME=your_email@qq.com        # 修改为你的邮箱
MAIL_PASSWORD=your_authorization_code   # QQ邮箱使用授权码

# ========================================
# AI 服务配置（可选）
# ========================================
MODELSCOPE_API_KEY=your_api_key         # ModelScope API 密钥
MODELSCOPE_ENABLED=true
```

### 4.3 生成安全的 JWT 密钥

```bash
# 生成随机 JWT 密钥
openssl rand -base64 48
# 复制输出结果到 .env 文件的 JWT_SECRET
```

---

## 5. 部署服务

### 5.1 启动所有服务

```bash
cd /opt/fitbitepal

# 首次启动（构建镜像并启动）
docker compose up -d --build

# 查看启动日志
docker compose logs -f
```

### 5.2 启动过程说明

```
启动顺序：
1. MySQL 数据库 → 等待健康检查通过（约30秒）
2. Redis 缓存   → 等待健康检查通过（约5秒）
3. Backend 后端 → 等待数据库和Redis就绪后启动（约60秒）
```

### 5.3 查看服务状态

```bash
# 查看所有容器状态
docker compose ps

# 预期输出：
# NAME                   STATUS                   PORTS
# fitbitepal-mysql       Up (healthy)             0.0.0.0:3306->3306/tcp
# fitbitepal-redis       Up (healthy)             0.0.0.0:6379->6379/tcp
# fitbitepal-backend     Up (healthy)             0.0.0.0:8080->8080/tcp
```

---

## 6. 验证部署

### 6.1 检查后端健康状态

```bash
# 本地检查
curl http://localhost:8080/api/actuator/health

# 预期返回：
{"status":"UP"}
```

### 6.2 从外部访问

在浏览器中访问：
```
http://你的VM-IP:8080/api/actuator/health
```

### 6.3 测试数据库连接

```bash
# 进入 MySQL 容器
docker exec -it fitbitepal-mysql mysql -u root -p

# 输入密码后，检查数据库
SHOW DATABASES;
USE fitbitepal;
SHOW TABLES;
```

### 6.4 配置移动端连接

修改移动端 `services/serverConfig.js`：

```javascript
// 将 API_BASE_URL 改为 VM 的 IP 地址
export const API_BASE_URL = 'http://你的VM-IP:8080/api';
```

---

## 7. 常用运维命令

### 7.1 服务管理

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart backend

# 停止并删除数据卷（⚠️ 会删除所有数据）
docker compose down -v
```

### 7.2 日志查看

```bash
# 查看所有服务日志
docker compose logs

# 实时查看后端日志
docker compose logs -f backend

# 查看最近100行日志
docker compose logs --tail=100 backend

# 查看 MySQL 日志
docker compose logs mysql
```

### 7.3 进入容器

```bash
# 进入后端容器
docker exec -it fitbitepal-backend sh

# 进入 MySQL 容器
docker exec -it fitbitepal-mysql bash

# 进入 Redis 容器
docker exec -it fitbitepal-redis sh
```

### 7.4 数据备份

```bash
# 备份 MySQL 数据库
docker exec fitbitepal-mysql mysqldump -u root -p'你的密码' fitbitepal > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker exec -i fitbitepal-mysql mysql -u root -p'你的密码' fitbitepal < backup_20241127.sql
```

### 7.5 更新部署

```bash
cd /opt/fitbitepal

# 拉取最新代码（如果使用 Git）
git pull

# 重新构建并启动
docker compose up -d --build

# 或者只重建后端
docker compose up -d --build backend
```

---

## 8. 故障排查

### 8.1 后端启动失败

**问题：** 后端容器反复重启

```bash
# 查看详细日志
docker compose logs backend

# 常见原因及解决：
# 1. 数据库未就绪 → 等待 MySQL 健康检查通过
# 2. 配置错误 → 检查 .env 文件
# 3. 内存不足 → 增加 VM 内存
```

### 8.2 数据库连接失败

**问题：** `Connection refused` 或 `Access denied`

```bash
# 检查 MySQL 容器是否运行
docker compose ps mysql

# 检查 MySQL 日志
docker compose logs mysql

# 验证密码是否正确
docker exec -it fitbitepal-mysql mysql -u root -p
```

### 8.3 端口被占用

**问题：** `port is already allocated`

```bash
# 检查端口占用
sudo netstat -tlnp | grep 8080
sudo netstat -tlnp | grep 3306

# 停止占用端口的进程
sudo kill -9 <PID>

# 或修改 .env 中的端口配置
BACKEND_PORT=8081
```

### 8.4 镜像构建失败

**问题：** `maven dependency download failed`

```bash
# 清理 Docker 缓存重新构建
docker compose build --no-cache backend

# 如果是网络问题，配置 Docker 镜像加速
sudo nano /etc/docker/daemon.json
```

添加镜像加速：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
```

```bash
# 重启 Docker
sudo systemctl restart docker
```

### 8.5 内存不足

**问题：** 容器被 OOM Killed

```bash
# 检查内存使用
docker stats

# 减少 JVM 内存占用，修改 docker-compose.yml
environment:
  JAVA_OPTS: "-Xms256m -Xmx512m"
```

---

## 9. 生产环境优化

### 9.1 配置防火墙

```bash
# Ubuntu (UFW)
sudo ufw allow 8080/tcp
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### 9.2 配置 HTTPS（使用 Nginx）

```bash
# 安装 Nginx
sudo apt install -y nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/fitbitepal
```

Nginx 配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/fitbitepal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9.3 设置自动重启

```bash
# Docker 已配置 restart: unless-stopped
# 确保 Docker 开机自启
sudo systemctl enable docker
```

---

## 快速参考卡片

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker 部署快速参考                        │
├─────────────────────────────────────────────────────────────┤
│  启动服务:     docker compose up -d                          │
│  停止服务:     docker compose down                           │
│  查看状态:     docker compose ps                             │
│  查看日志:     docker compose logs -f backend                │
│  重新构建:     docker compose up -d --build                  │
│  进入容器:     docker exec -it fitbitepal-backend sh        │
│  健康检查:     curl http://localhost:8080/api/actuator/health │
└─────────────────────────────────────────────────────────────┘
```

---

**部署完成！** 🎉

如有问题，请查看日志或参考故障排查章节。

