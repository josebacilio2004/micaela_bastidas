@echo off
title Sistema Mercado Micaela Bastidas - Iniciando...
color 0A
echo ========================================================
echo     SISTEMA INTEGRADO MERCADO MICAELA BASTIDAS
echo ========================================================
echo.
echo [1/3] Verificando Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no esta en ejecucion.
    echo Por favor inicie Docker Desktop y vuelva a intentar.
    pause
    exit /b
)

echo [2/3] Levantando servidores del Mercado (Nginx, Web, Backend, Base de Datos)...
cd /d "%~dp0"
docker compose up -d

echo.
echo [3/3] Abriendo navegador del Sistema...
timeout /t 3 /nobreak >nul
start http://localhost

echo.
echo ========================================================
echo  SISTEMA EN LINEA EXITOSAMENTE: http://localhost
echo  Para conectar celulares con la App en el Wi-Fi del mercado:
ipconfig | findstr /i "IPv4"
echo ========================================================
echo.
pause
