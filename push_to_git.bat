@echo off
echo Committing and pushing updates to GitHub from Downloads...
cd /d "C:\Users\khanf\Downloads\Reliv-Test-Fixed\Reliv-Test"
git add .
git commit -m "feat: align reminder times and implement backend keep-awake self-ping"
git push origin main
echo.
echo Done! Press any key to exit.
pause
