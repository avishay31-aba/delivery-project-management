param(
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$releaseRoot = Join-Path $root 'release\DeliveryERP-1.0-Beta'
$workRoot = Join-Path $PSScriptRoot 'work'
$payloadRoot = Join-Path $workRoot 'payload'
$payloadZip = Join-Path $workRoot 'payload.zip'
$installerExe = Join-Path $releaseRoot 'DeliveryERP-1.0-Beta-Installer.exe'
$portableExe = Join-Path $releaseRoot 'DeliveryERP-1.0-Beta-Portable.exe'

function Reset-Directory($path) {
  if (Test-Path $path) {
    Remove-Item -LiteralPath $path -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $path | Out-Null
}

function New-DeliveryErpIcon($path) {
  Add-Type -AssemblyName System.Drawing
  $bitmap = New-Object System.Drawing.Bitmap 64, 64
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(15, 82, 92))
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(37, 177, 140))
  $graphics.FillRectangle($brush, 10, 10, 44, 44)
  $font = New-Object System.Drawing.Font 'Segoe UI', 17, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $textBrush = [System.Drawing.Brushes]::White
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString('ERP', $font, $textBrush, (New-Object System.Drawing.RectangleF 0, 0, 64, 64), $format)
  $iconHandle = $bitmap.GetHicon()
  $icon = [System.Drawing.Icon]::FromHandle($iconHandle)
  $stream = [System.IO.File]::Open($path, [System.IO.FileMode]::Create)
  $icon.Save($stream)
  $stream.Close()
  $graphics.Dispose()
  $bitmap.Dispose()
}

if (-not $SkipBuild) {
  Push-Location $root
  try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
      throw "npm run build failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path (Join-Path $root 'dist\index.html'))) {
  throw 'Production build output was not found. Run npm run build before packaging.'
}

Reset-Directory $releaseRoot
Reset-Directory $workRoot
Reset-Directory $payloadRoot

Copy-Item -Path (Join-Path $root 'dist') -Destination (Join-Path $payloadRoot 'app') -Recurse
New-DeliveryErpIcon (Join-Path $payloadRoot 'delivery-erp.ico')

$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) {
  $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
}
if (-not (Test-Path $csc)) {
  throw 'The .NET Framework C# compiler was not found.'
}

$iconPath = Join-Path $payloadRoot 'delivery-erp.ico'
$references = @(
  '/reference:System.dll',
  '/reference:System.Core.dll',
  '/reference:System.Windows.Forms.dll',
  '/reference:System.IO.Compression.dll',
  '/reference:System.IO.Compression.FileSystem.dll'
)

& $csc /nologo /target:winexe "/out:$(Join-Path $payloadRoot 'Delivery ERP.exe')" "/win32icon:$iconPath" $references (Join-Path $PSScriptRoot 'runtime\DeliveryErpLauncher.cs')
if ($LASTEXITCODE -ne 0) {
  throw "Runtime launcher compilation failed with exit code $LASTEXITCODE"
}

$releaseNotes = @'
Delivery ERP 1.0 Beta

- Installs Delivery ERP as a local Windows application.
- Includes the official Version 1.0 clean seed dataset.
- Uses per-user local browser storage on each tester laptop.
- No source code, development scripts, Git metadata, or node_modules are included in the release package.
'@
Set-Content -LiteralPath (Join-Path $releaseRoot 'Release-Notes.txt') -Value $releaseNotes -Encoding UTF8
Set-Content -LiteralPath (Join-Path $payloadRoot 'Release-Notes.txt') -Value $releaseNotes -Encoding UTF8

Compress-Archive -Path (Join-Path $payloadRoot '*') -DestinationPath $payloadZip -Force

& $csc /nologo /target:winexe "/out:$installerExe" "/win32icon:$iconPath" "/resource:$payloadZip,payload.zip" $references (Join-Path $PSScriptRoot 'installer\Installer.cs')
if ($LASTEXITCODE -ne 0) {
  throw "Installer compilation failed with exit code $LASTEXITCODE"
}

& $csc /nologo /target:winexe "/out:$portableExe" "/win32icon:$iconPath" "/resource:$payloadZip,payload.zip" $references (Join-Path $PSScriptRoot 'portable\PortableLauncher.cs')
if ($LASTEXITCODE -ne 0) {
  throw "Portable compilation failed with exit code $LASTEXITCODE"
}

Get-ChildItem -LiteralPath $releaseRoot | Select-Object Name, Length, LastWriteTime
