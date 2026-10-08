@echo off
title Sistema Mercado Micaela Bastidas - Deteniendo...
color 0C
echo ========================================================
echo   DETENIENDO SERVIDORES MERCADO MICAELA BASTIDAS
echo ========================================================
echo.
cd /d "%~dp0"
docker compose down
echo.
echo [OK] Servidores detenidos correctamente y datos guardados de forma segura.
pause
