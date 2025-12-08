# FitBite Pal Backend - Dockerfile
# 多阶段构建

# ========================================
# 阶段 1: 构建
# ========================================
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# 复制 pom.xml 并下载依赖 (利用 Docker 缓存)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 复制源代码并构建
COPY src ./src
RUN mvn package -DskipTests -B

# ========================================
# 阶段 2: 运行
# ========================================
FROM eclipse-temurin:17-jre-alpine

LABEL maintainer="FitBite Pal Team"
LABEL description="FitBite Pal Backend API Server"
LABEL version="1.0.0"

WORKDIR /app

# 创建非 root 用户
RUN addgroup -S fitbitepal && adduser -S fitbitepal -G fitbitepal

# 从构建阶段复制 JAR 文件
COPY --from=builder /app/target/*.jar app.jar

# 复制静态资源 (管理后台)
COPY --from=builder /app/target/classes/static ./static

# 设置文件权限
RUN chown -R fitbitepal:fitbitepal /app

# 切换到非 root 用户
USER fitbitepal

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/api/actuator/health || exit 1

# JVM 优化参数
ENV JAVA_OPTS="-Xms512m -Xmx1024m -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError"

# 启动命令
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

