@echo off
title Copia de Seguridad Base de Datos - Mercado Micaela Bastidas
color 0B
echo ========================================================
echo   RESPALDO DE BASE DE DATOS - MERCADO MICAELA BASTIDAS
echo ========================================================
echo.
if not exist "backups_db" mkdir "backups_db"

set FECHA=%date:~-4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set FECHA=%FECHA: =0%
set DESTINO=backups_db\backup_micaela_%FECHA%.sql

echo Generando respaldo en %DESTINO%...
docker exec micaela_postgres pg_dump -U micaela_admin micaela_bastidas > "%DESTINO%"

if %errorlevel% equ 0 (
    echo.
    echo [OK] Copia de seguridad guardada con exito en: %DESTINO%
) else (
    echo.
    echo [ERROR] Ocurrio un error al generar la copia de seguridad.
)
pause
