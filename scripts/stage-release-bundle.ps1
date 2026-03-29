$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

$distDir = Join-Path (Get-Location) "dist"
$bundleDir = Join-Path $distDir "bundle"
$payloadDir = Join-Path $bundleDir "payload"
$topLevelPayloadDir = Join-Path $distDir "payload"
$payloadDocDir = Join-Path $payloadDir "doc"
$topLevelPayloadDocDir = Join-Path $topLevelPayloadDir "doc"

Remove-Item -LiteralPath $bundleDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $topLevelPayloadDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $payloadDir -Force | Out-Null
New-Item -ItemType Directory -Path $topLevelPayloadDir -Force | Out-Null
New-Item -ItemType Directory -Path $payloadDocDir -Force | Out-Null
New-Item -ItemType Directory -Path $topLevelPayloadDocDir -Force | Out-Null

function Copy-IfExists {
  param(
    [string]$SourcePath,
    [string]$DestinationPath
  )

  if (Test-Path $SourcePath) {
    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
  }
}

function Copy-DirectoryContents {
  param(
    [string]$SourceDirectory,
    [string]$DestinationDirectory
  )

  if (-not (Test-Path $SourceDirectory)) {
    return
  }

  Get-ChildItem -LiteralPath $SourceDirectory -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $DestinationDirectory $_.Name) -Force
  }
}

$requiredFiles = @(
  ".\dist\linksy.exe",
  ".\native\Linksy.FocusHelper\bin\Release\net9.0-windows\win-x64\publish\Linksy.FocusHelper.exe",
  ".\icon.ico",
  ".\doc\icon.png",
  ".\scripts\copy-link-hidden.vbs"
)

foreach ($requiredFile in $requiredFiles) {
  if (-not (Test-Path $requiredFile)) {
    throw "Missing required build artifact: $requiredFile"
  }
}

Copy-Item -LiteralPath ".\dist\linksy.exe" -Destination (Join-Path $payloadDir "linksy.exe") -Force
Copy-Item -LiteralPath ".\native\Linksy.FocusHelper\bin\Release\net9.0-windows\win-x64\publish\Linksy.FocusHelper.exe" -Destination (Join-Path $payloadDir "Linksy.FocusHelper.exe") -Force
Copy-Item -LiteralPath ".\icon.ico" -Destination (Join-Path $payloadDir "icon.ico") -Force
Copy-Item -LiteralPath ".\doc\icon.png" -Destination (Join-Path $payloadDocDir "icon.png") -Force
Copy-Item -LiteralPath ".\scripts\copy-link-hidden.vbs" -Destination (Join-Path $payloadDir "copy-link-hidden.vbs") -Force
Copy-Item -LiteralPath ".\dist\linksy.exe" -Destination (Join-Path $topLevelPayloadDir "linksy.exe") -Force
Copy-Item -LiteralPath ".\native\Linksy.FocusHelper\bin\Release\net9.0-windows\win-x64\publish\Linksy.FocusHelper.exe" -Destination (Join-Path $topLevelPayloadDir "Linksy.FocusHelper.exe") -Force
Copy-Item -LiteralPath ".\icon.ico" -Destination (Join-Path $topLevelPayloadDir "icon.ico") -Force
Copy-Item -LiteralPath ".\doc\icon.png" -Destination (Join-Path $topLevelPayloadDocDir "icon.png") -Force
Copy-Item -LiteralPath ".\scripts\copy-link-hidden.vbs" -Destination (Join-Path $topLevelPayloadDir "copy-link-hidden.vbs") -Force

$launcherBuildDir = ".\dist\native-tools\LinksyLauncher"
$installerBuildDir = ".\dist\native-tools\LinksyInstaller"
$uninstallerBuildDir = ".\dist\native-tools\LinksyUninstaller"

Copy-DirectoryContents -SourceDirectory $launcherBuildDir -DestinationDirectory $payloadDir
Copy-DirectoryContents -SourceDirectory $uninstallerBuildDir -DestinationDirectory $payloadDir
Copy-DirectoryContents -SourceDirectory $launcherBuildDir -DestinationDirectory $topLevelPayloadDir
Copy-DirectoryContents -SourceDirectory $uninstallerBuildDir -DestinationDirectory $topLevelPayloadDir
Copy-DirectoryContents -SourceDirectory $launcherBuildDir -DestinationDirectory $bundleDir
Copy-DirectoryContents -SourceDirectory $installerBuildDir -DestinationDirectory $bundleDir
Copy-DirectoryContents -SourceDirectory $uninstallerBuildDir -DestinationDirectory $bundleDir

Copy-Item -LiteralPath (Join-Path $bundleDir "LinksyInstaller.exe") -Destination (Join-Path $distDir "LinksyInstaller.exe") -Force
