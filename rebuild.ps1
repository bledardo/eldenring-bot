# Elden Ring Watcher — sync from WSL + rebuild .exe
# Run from PowerShell: .\rebuild.ps1

$ErrorActionPreference = "Stop"
$wslSource = "\\wsl.localhost\Debian\home\hamza\eldenring-bot\watcher"
$localProject = "$env:USERPROFILE\Desktop\eldenring-bot"
$localWatcher = "$localProject\watcher"

Write-Host "=== Elden Ring Watcher Build ===" -ForegroundColor Cyan

# Kill running watcher
$proc = Get-Process -Name "EldenWatcher" -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "Stopping running Watcher..." -ForegroundColor Yellow
    $proc | Stop-Process -Force
    Start-Sleep -Seconds 1
}

# Sync watcher/ from WSL
Write-Host "Syncing watcher/ from WSL..." -ForegroundColor Yellow
robocopy $wslSource $localWatcher /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
# Also sync build files
Copy-Item "\\wsl.localhost\Debian\home\hamza\eldenring-bot\build.spec" $localProject -Force
Copy-Item "\\wsl.localhost\Debian\home\hamza\eldenring-bot\build.py" $localProject -Force -ErrorAction SilentlyContinue
Write-Host "Sync done" -ForegroundColor Green

# Check/install Tesseract OCR
Push-Location $localProject
$tesseractPath = "C:\Program Files\Tesseract-OCR\tesseract.exe"
if (-not (Test-Path $tesseractPath)) {
    Write-Host "Installing Tesseract OCR..." -ForegroundColor Yellow
    $installerUrl = "https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.5.0.20241111.exe"
    $installerPath = "$env:TEMP\tesseract-installer.exe"
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
    # Silent install with French language data
    Start-Process -Wait -FilePath $installerPath -ArgumentList "/S", "/D=C:\Program Files\Tesseract-OCR"
    Remove-Item $installerPath -ErrorAction SilentlyContinue
    # Download French language data if not included
    $tessdata = "C:\Program Files\Tesseract-OCR\tessdata"
    if (-not (Test-Path "$tessdata\fra.traineddata")) {
        Write-Host "Downloading French language data..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri "https://github.com/tesseract-ocr/tessdata/raw/main/fra.traineddata" -OutFile "$tessdata\fra.traineddata"
    }
    Write-Host "Tesseract installed" -ForegroundColor Green
} else {
    Write-Host "Tesseract OK" -ForegroundColor Green
}

# Install Python dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r "\\wsl.localhost\Debian\home\hamza\eldenring-bot\requirements.txt" --quiet

# Build
Write-Host "Building .exe..." -ForegroundColor Yellow
pyinstaller build.spec --noconfirm --clean

if (Test-Path "dist\EldenWatcher.exe") {
    $size = [math]::Round((Get-Item "dist\EldenWatcher.exe").Length / 1MB)
    Write-Host "Done! ${size}MB" -ForegroundColor Green

    $launch = Read-Host "Launch now? (y/n)"
    if ($launch -eq "y") {
        Start-Process "dist\EldenWatcher.exe"
        Write-Host "Watcher started!" -ForegroundColor Green
    }
} else {
    Write-Host "Build failed!" -ForegroundColor Red
}
Pop-Location
