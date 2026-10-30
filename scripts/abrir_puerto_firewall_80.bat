@echo off
title Abrir Puerto 80 - Mercado Micaela Bastidas
echo ====================================================================
echo HABILITANDO PUERTO 80 EN EL FIREWALL DE WINDOWS PARA LA APP MOVIL
echo Mercado de Abastos Micaela Bastidas
echo ====================================================================
echo.
netsh advfirewall firewall add rule name="Micaela Port 80" dir=in action=allow protocol=TCP localport=80
echo.
if %ERRORLEVEL% EQU 0 (
    echo ====================================================================
    echo [EXITO] Puerto 80 habilitado correctamente en el Firewall de Windows!
    echo.
    echo Su celular ya puede conectarse con la app movil a:
    echo   http://192.168.1.3/api
    echo ====================================================================
) else (
    echo ====================================================================
    echo [ATENCION] Se requieren permisos de Administrador:
    echo Por favor haga clic derecho sobre este archivo y elija:
    echo 'Ejecutar como administrador'
    echo ====================================================================
)
echo.
pause
