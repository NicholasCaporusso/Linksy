param(
  [switch]$Yes
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not $Yes) {
  $answer = Read-Host "Remove 'Get Linksy link' from the Explorer right-click menu? [y/N]"
  if ($answer -notmatch '^(?i:y|yes)$') {
    throw "Cancelled without changing the Explorer context menu."
  }
}

node .\app.js uninstall-context-menu --yes
