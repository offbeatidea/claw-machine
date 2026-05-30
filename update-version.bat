@echo off
chcp 65001 > nul
echo ================================================
echo   抓娃娃机 - 版本更新工具
echo ================================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo 请选择版本更新类型：
echo   [1] 递增 patch 版本号（默认，如 v3.3.0 → v3.3.1）
echo   [2] 递增 minor 版本号（如 v3.3.0 → v3.4.0）
echo   [3] 递增 major 版本号（如 v3.3.0 → v4.0.0）
echo   [4] 仅更新 build 时间戳（保持版本号不变）
echo   [5] 设置指定版本号
echo.
set /p choice=请输入选项（1-5）：

if "%choice%"=="1" (
    node update-version.js --patch
) else if "%choice%"=="2" (
    node update-version.js --minor
) else if "%choice%"=="3" (
    node update-version.js --major
) else if "%choice%"=="4" (
    node update-version.js --build
) else if "%choice%"=="5" (
    set /p versionStr=请输入版本号（如 v3.3.1-build20260531a）：
    node update-version.js --set %versionStr%
) else (
    echo [错误] 无效选项，使用默认（递增 patch）
    node update-version.js --patch
)

echo.
echo ================================================
echo 版本更新完成！
echo 请手动编辑 version.json 中的 "changes" 字段，记录本次变更内容
echo ================================================
pause
