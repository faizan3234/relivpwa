@echo off
echo Committing and pushing updates to GitHub...
cd /d "c:\Users\khanf\Downloads\Reliv-Test\Reliv-Test"
git add .
git commit -m "fix: updated notifications and responsiveness"
git push
echo.
echo Done! Press any key to exit.
pause
