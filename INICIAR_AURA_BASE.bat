@echo off
setlocal
cd /d "%~dp0"
if not exist "index.html" (echo ERROR: Falta index.html & pause & exit /b 1)
where py >nul 2>nul
if %errorlevel%==0 (
  start "AURA BASE 1.6 servidor" cmd /k "py server.py"
) else (
  where python >nul 2>nul
  if errorlevel 1 (echo ERROR: Necesitas Python 3 instalado & pause & exit /b 1)
  start "AURA BASE 1.6 servidor" cmd /k "python server.py"
)
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8765/"
endlocal
