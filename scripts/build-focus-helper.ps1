$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
dotnet publish .\native\Linksy.FocusHelper\Linksy.FocusHelper.csproj -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true
