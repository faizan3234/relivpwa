@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo  Antigravity AI Git Update Automator
echo ==============================================
echo.
echo [1/3] Adding all updated files...
git add -A
echo.
echo [2/3] Committing changes...
git diff --cached --quiet
if errorlevel 1 (
	for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "CURRENT_BRANCH=%%b"
	if not defined CURRENT_BRANCH (
		echo Could not detect the current branch.
		pause
		exit /b 1
	)
	git commit -m "Auto-update: sync Relix changes"
) else (
	echo No changes to commit.
	echo.
	echo ==============================================
	echo  Git repository update skipped.
	echo ==============================================
	pause
	exit /b 0
)
echo.
echo [3/3] Pushing to repository...
git push -u origin %CURRENT_BRANCH%
if errorlevel 1 (
	echo.
	echo Push failed. Please check your remote and credentials.
	pause
	exit /b 1
)
echo.
echo ==============================================
echo  Git repository updated successfully!
echo ==============================================
pause
