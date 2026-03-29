param(
  [switch]$Yes
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not $Yes) {
  $answer = Read-Host "Add 'Get Linksy link' to the Explorer right-click menu for files and folders? [y/N]"
  if ($answer -notmatch '^(?i:y|yes)$') {
    throw "Cancelled without changing the Explorer context menu."
  }
}

node .\app.js install-context-menu --yes
