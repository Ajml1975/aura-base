@echo off
set /p ARCHIVO=Arrastra aqui el archivo .aura-access.json y pulsa INTRO: 
set "ARCHIVO=%ARCHIVO:\"=%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Convertir-A-Access.ps1" -Entrada "%ARCHIVO%" -Formato mdb
pause
