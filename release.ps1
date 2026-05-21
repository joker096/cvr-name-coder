param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Message
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  cvr.name.coder Release Pipeline" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Invoke-Step {
    param([string]$Name, [ScriptBlock]$Script)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Name..." -ForegroundColor Yellow -NoNewline
    try {
        & $Script | Out-Null
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Write-Host " FAILED" -ForegroundColor Red
        throw $_
    }
}

Invoke-Step "Type check" { npm run type-check }
Invoke-Step "Build project" { npm run build }
Invoke-Step "Package VS Code extension" { npm run package:vscode }

Write-Host ""
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Git operations..." -ForegroundColor Yellow

$hasChanges = $false
try {
    git diff --quiet
    git diff --cached --quiet
    $hasChanges = $false
} catch {
    $hasChanges = $true
}

if (-not $hasChanges) {
    $untracked = git ls-files --others --exclude-standard
    if ($untracked) { $hasChanges = $true }
}

if (-not $hasChanges) {
    Write-Host "  No changes to commit. Skipping git push." -ForegroundColor Magenta
} else {
    Write-Host "  Staging changes..." -ForegroundColor Gray
    git add .

    Write-Host "  Committing..." -ForegroundColor Gray
    git commit -m $Message

    Write-Host "  Pushing..." -ForegroundColor Gray
    git push

    $commitHash = git rev-parse --short HEAD
    Write-Host "  Commit: $commitHash" -ForegroundColor Green
}

$vsixFiles = Get-ChildItem -Path "vscode\*.vsix" -Name | Sort-Object -Descending
$latestVsix = $vsixFiles | Select-Object -First 1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Release complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
if ($commitHash) { Write-Host "  Commit : $commitHash" -ForegroundColor Green }
if ($latestVsix)   { Write-Host "  VSIX   : vscode/$latestVsix" -ForegroundColor Green }
Write-Host ""
