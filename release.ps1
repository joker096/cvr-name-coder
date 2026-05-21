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
Invoke-Step "Sync dist to vscode/app" { Copy-Item -Recurse -Force (Join-Path $PSScriptRoot "dist\*") (Join-Path $PSScriptRoot "vscode\app\") }
Invoke-Step "Package VS Code extension" { npm run package:vscode }

$vsixFiles = Get-ChildItem -Path "vscode\*.vsix" -Name | Sort-Object -Descending
$latestVsix = $vsixFiles | Select-Object -First 1
$vsixPath = Join-Path $PSScriptRoot "vscode\$latestVsix"

Write-Host ""
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Installing VS Code extension..." -ForegroundColor Yellow
code --install-extension $vsixPath 2>&1 | Out-Null

# Auto-remove old extension versions
$extId = "cvr-name.cvr-name-coder"
$extDir = Join-Path $env:USERPROFILE ".vscode\extensions"
$newVersion = ""
if (Test-Path "vscode\package.json") {
    $pkg = Get-Content "vscode\package.json" | ConvertFrom-Json
    $newVersion = $pkg.version
}
$oldDirs = Get-ChildItem -Path $extDir -Directory -Filter "$extId-*" | Where-Object { $_.Name -ne "$extId-$newVersion" }
if ($oldDirs.Count -gt 0) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Removing $($oldDirs.Count) old version(s)..." -ForegroundColor Yellow
    $oldDirs | ForEach-Object {
        Remove-Item -Recurse -Force $_.FullName -ErrorAction SilentlyContinue
        Write-Host "    Removed: $($_.Name)" -ForegroundColor Gray
    }
}

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
