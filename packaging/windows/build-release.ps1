$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$releaseRoot = Join-Path $root 'release\DeliveryERP-1.0-Beta'
$iconRoot = Join-Path $root 'build'
$iconPath = Join-Path $iconRoot 'icon.ico'

function New-DeliveryErpIcon($path) {
  Add-Type -AssemblyName System.Drawing
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path) | Out-Null

  $bitmap = New-Object System.Drawing.Bitmap 256, 256
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(15, 82, 92))

  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(37, 177, 140))
  $graphics.FillRectangle($brush, 40, 40, 176, 176)

  $font = New-Object System.Drawing.Font 'Segoe UI', 68, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString('ERP', $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 0, 256, 256), $format)

  $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
  $stream = [System.IO.File]::Open($path, [System.IO.FileMode]::Create)
  $icon.Save($stream)
  $stream.Close()

  $graphics.Dispose()
  $bitmap.Dispose()
}

Push-Location $root
try {
  if (-not (Test-Path (Join-Path $root 'dist\index.html'))) {
    throw 'Production build output was not found. Run npm run build before packaging.'
  }

  if (Test-Path $releaseRoot) {
    Remove-Item -LiteralPath $releaseRoot -Recurse -Force
  }

  New-DeliveryErpIcon $iconPath

  & npx.cmd electron-builder --win --x64
  if ($LASTEXITCODE -ne 0) {
    throw "electron-builder failed with exit code $LASTEXITCODE"
  }

  $nonDistributionOutputs = @(
    (Join-Path $releaseRoot 'win-unpacked'),
    (Join-Path $releaseRoot 'builder-debug.yml'),
    (Join-Path $releaseRoot 'latest.yml')
  )

  foreach ($path in $nonDistributionOutputs) {
    if (Test-Path $path) {
      Remove-Item -LiteralPath $path -Recurse -Force
    }
  }

  Get-ChildItem -LiteralPath $releaseRoot -Filter '*.blockmap' | Remove-Item -Force

  $releaseNotes = @'
Delivery ERP 1.0 Beta

- Windows beta package for external testers.
- Includes the official Version 1.0 clean seed dataset in the bundled application.
- Uses independent per-user Electron/Chromium local application storage.
- Release artifacts contain packaged build outputs only, not source code or development dependencies.
'@
  Set-Content -LiteralPath (Join-Path $releaseRoot 'Release-Notes.txt') -Value $releaseNotes -Encoding UTF8

  Get-ChildItem -LiteralPath $releaseRoot | Select-Object Name, Length, LastWriteTime
} finally {
  Pop-Location
}
