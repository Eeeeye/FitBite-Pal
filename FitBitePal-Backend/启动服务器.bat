@echo off
chcp 65001 >nul
cls
echo ========================================
echo    FitBitePal Backend 服务器启动
echo ========================================
echo.
echo 正在启动...
echo.
echo 请确保:
echo 1. Java 17 已安装
echo 2. MySQL已安装并创建了fitbitepal数据库
echo    (或修改application.yml使用H2数据库)
echo.
echo ----------------------------------------
echo.

cd /d %~dp0

REM 尝试使用Maven
where mvn >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo 使用Maven启动...
    mvn spring-boot:run
) else (
    echo 使用Maven Wrapper启动...
    call mvnw spring-boot:run
)

pause




