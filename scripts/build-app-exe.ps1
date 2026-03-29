$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

New-Item -ItemType Directory -Path ".\dist" -Force | Out-Null

& .\node_modules\.bin\pkg.cmd . --targets node18-win-x64 --output dist/linksy.exe
if ($LASTEXITCODE -ne 0) {
  throw "pkg failed."
}
