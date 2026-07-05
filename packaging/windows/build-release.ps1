$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$releaseRoot = Join-Path $root 'release\DeliveryERP-1.0-Beta'
$workRoot = Join-Path $PSScriptRoot 'work'
$seaConfigPath = Join-Path $workRoot 'sea-config.json'
$seaBlobPath = Join-Path $workRoot 'delivery-erp.blob'
$launcherExe = Join-Path $workRoot 'Delivery ERP.exe'
$installerScript = Join-Path $workRoot 'installer.nsi'
$installerExe = Join-Path $releaseRoot 'DeliveryERP-1.0.0-beta-Installer.exe'
$portableExe = Join-Path $releaseRoot 'DeliveryERP-1.0.0-beta-Portable.exe'

function Reset-Directory($path) {
  if (Test-Path $path) {
    Remove-Item -LiteralPath $path -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $path | Out-Null
}

function Find-MakeNsis {
  $candidates = @()
  $cacheRoot = Join-Path $env:LOCALAPPDATA 'electron-builder\Cache'
  if (Test-Path $cacheRoot) {
    $candidates += Get-ChildItem -LiteralPath $cacheRoot -Recurse -Filter makensis.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
  }

  $pathCandidate = Get-Command makensis.exe -ErrorAction SilentlyContinue
  if ($pathCandidate) {
    $candidates += $pathCandidate.Source
  }

  $selected = $candidates | Select-Object -First 1
  if (-not $selected) {
    throw 'NSIS makensis.exe was not found. Build once on a machine with NSIS available, or restore the existing electron-builder NSIS cache.'
  }

  return $selected
}

function New-AssetMap {
  $distRoot = Join-Path $root 'dist'
  $assets = [ordered]@{}

  Get-ChildItem -LiteralPath $distRoot -Recurse -File | ForEach-Object {
    $rootPrefix = $distRoot.TrimEnd('\') + '\'
    $relative = $_.FullName.Substring($rootPrefix.Length).Replace('\', '/')
    if ($relative.EndsWith('.map')) {
      return
    }
    $assets["app/$relative"] = $_.FullName
  }

  return $assets
}

Push-Location $root
try {
  if (-not (Test-Path (Join-Path $root 'dist\index.html'))) {
    throw 'Production build output was not found. Run npm run build before packaging.'
  }

  Reset-Directory $releaseRoot
  Reset-Directory $workRoot

  $assets = New-AssetMap
  $seaConfig = [ordered]@{
    main = (Join-Path $root 'packaging\localhost\server.cjs')
    output = $seaBlobPath
    disableExperimentalSEAWarning = $true
    useCodeCache = $false
    useSnapshot = $false
    assets = $assets
  }
  $seaConfig | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $seaConfigPath -Encoding UTF8

  & node --experimental-sea-config $seaConfigPath
  if ($LASTEXITCODE -ne 0) {
    throw "Node SEA blob generation failed with exit code $LASTEXITCODE"
  }

  $nodePath = (Get-Command node.exe).Source
  Copy-Item -LiteralPath $nodePath -Destination $launcherExe -Force

  & npx.cmd postject $launcherExe NODE_SEA_BLOB $seaBlobPath --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
  if ($LASTEXITCODE -ne 0) {
    throw "postject failed with exit code $LASTEXITCODE"
  }

  Copy-Item -LiteralPath $launcherExe -Destination $portableExe -Force

  $releaseNotes = @'
Delivery ERP 1.0 Beta

- Runs as a local web app at localhost in the user's default browser.
- Includes the official Version 1.0 Beta Seed Dataset in the bundled production build.
- Uses independent per-user browser local storage.
- Release artifacts contain packaged build outputs only, not source code or development dependencies.
'@
  Set-Content -LiteralPath (Join-Path $releaseRoot 'Release-Notes.txt') -Value $releaseNotes -Encoding UTF8

  $makeNsis = Find-MakeNsis
  $escapedLauncher = $launcherExe.Replace('\', '\\')
  $escapedInstaller = $installerExe.Replace('\', '\\')
  $nsi = @"
Unicode true
Name "Delivery ERP"
OutFile "$escapedInstaller"
InstallDir "`$LOCALAPPDATA\Programs\Delivery ERP"
RequestExecutionLevel user
ShowInstDetails nevershow
ShowUninstDetails nevershow

Section "Install"
  SetOutPath "`$INSTDIR"
  File /oname=DeliveryERP.exe "$escapedLauncher"
  CreateDirectory "`$SMPROGRAMS\Delivery ERP"
  CreateShortcut "`$SMPROGRAMS\Delivery ERP\Delivery ERP.lnk" "`$INSTDIR\DeliveryERP.exe"
  CreateShortcut "`$DESKTOP\Delivery ERP.lnk" "`$INSTDIR\DeliveryERP.exe"
  WriteUninstaller "`$INSTDIR\Uninstall Delivery ERP.exe"
SectionEnd

Section "Uninstall"
  Delete "`$SMPROGRAMS\Delivery ERP\Delivery ERP.lnk"
  RMDir "`$SMPROGRAMS\Delivery ERP"
  Delete "`$DESKTOP\Delivery ERP.lnk"
  Delete "`$INSTDIR\DeliveryERP.exe"
  Delete "`$INSTDIR\Uninstall Delivery ERP.exe"
  RMDir "`$INSTDIR"
SectionEnd
"@
  Set-Content -LiteralPath $installerScript -Value $nsi -Encoding UTF8

  & $makeNsis $installerScript
  if ($LASTEXITCODE -ne 0) {
    throw "NSIS installer build failed with exit code $LASTEXITCODE"
  }

  if (-not (Test-Path $installerExe)) {
    throw "Installer output was not created at $installerExe"
  }
  if (-not (Test-Path $portableExe)) {
    throw "Portable output was not created at $portableExe"
  }

  Get-ChildItem -LiteralPath $releaseRoot | Select-Object Name, Length, LastWriteTime
} finally {
  Pop-Location
}
