$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

$distNativeToolsDir = Join-Path (Get-Location) "dist\native-tools"

$projects = @(
  @{ Path = ".\native\Linksy.Launcher\Linksy.Launcher.csproj"; Name = "LinksyLauncher" },
  @{ Path = ".\native\Linksy.Installer\Linksy.Installer.csproj"; Name = "LinksyInstaller" },
  @{ Path = ".\native\Linksy.Uninstaller\Linksy.Uninstaller.csproj"; Name = "LinksyUninstaller" }
)

Remove-Item -LiteralPath $distNativeToolsDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $distNativeToolsDir -Force | Out-Null

foreach ($project in $projects) {
  $projectDirectory = Split-Path -Parent $project.Path
  $publishDirectory = Join-Path $distNativeToolsDir $project.Name
  Remove-Item -LiteralPath (Join-Path $projectDirectory "bin") -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath (Join-Path $projectDirectory "obj") -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $publishDirectory -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $publishDirectory -Force | Out-Null
  dotnet publish $project.Path -c Release -r win-x64 --self-contained true -o $publishDirectory
}
