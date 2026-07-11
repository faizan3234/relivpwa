Write-Host "Committing and pushing updates to GitHub..."
git add .
git commit -m "feat: daily reset calendar check, organic XP recalculation, and dynamic state preservation"
git push origin main
Write-Host "Done!"
