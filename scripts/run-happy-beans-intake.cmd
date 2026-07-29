@echo off
setlocal
cd /d "%~dp0.."
echo Starting Happy Beans local AI intake assistant...
npm.cmd run intake
if errorlevel 1 (
  echo.
  echo The batch did not complete. Check %CD%\HappyBeans-Inbox\failed for the safe error summary.
  pause
  exit /b 1
)
echo.
echo Finished. Open the preview under %CD%\HappyBeans-Inbox\output.
pause
endlocal
