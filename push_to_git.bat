@echo off
setlocal
cd /d "%~dp0"

echo Committing and pushing updates to GitHub...
echo.

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "CURRENT_BRANCH=%%b"
if not defined CURRENT_BRANCH (
	echo Not a git repository or branch could not be detected.
	pause
	exit /b 1
)

git add -A
git diff --cached --quiet
if errorlevel 1 (
	git commit -m "feat: sync local Relix updates"
) else (
	echo No changes to commit.
	echo.
	echo Done! Press any key to exit.
	pause
	exit /b 0
)

git push -u origin %CURRENT_BRANCH%
if errorlevel 1 (
	echo.
	echo Push failed. Please check your remote connection and credentials.
	pause
	exit /b 1
)

echo.
echo Done! Press any key to exit.
pause
