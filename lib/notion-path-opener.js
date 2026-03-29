const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { URL } = require("url");
const { getPreferredPort } = require("./runtime-config");

const DEFAULT_HOST = process.env.HOST || "127.0.0.1";
const DEFAULT_PORT = getPreferredPort();
const API_TOKEN = process.env.OPEN_PATH_TOKEN || "linksy";
const DEBUG_LINKSY = process.env.LINKSY_DEBUG === "1";

function debugLog(...parts) {
  if (!DEBUG_LINKSY) {
    return;
  }

  console.log("[Linksy]", ...parts);
}

function decodeInputPath(input) {
  if (!input || typeof input !== "string") {
    throw new Error("Missing path parameter.");
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Path parameter is empty.");
  }

  if (trimmed.startsWith("file://")) {
    return fileUrlToWindowsPath(trimmed);
  }

  return trimmed;
}

function fileUrlToWindowsPath(fileUrl) {
  let parsed;
  try {
    parsed = new URL(fileUrl);
  } catch {
    throw new Error("Invalid file URL.");
  }

  if (parsed.protocol !== "file:") {
    throw new Error("Only file:// URLs are supported.");
  }

  const pathname = decodeURIComponent(parsed.pathname || "");
  const normalized = pathname.replace(/\//g, "\\");

  if (parsed.hostname) {
    return `\\\\${parsed.hostname}${normalized}`;
  }

  return normalized.replace(/^\\([A-Za-z]:\\)/, "$1");
}

function normalizeWindowsPath(rawPath) {
  if (typeof rawPath !== "string") {
    throw new Error("Path must be a string.");
  }

  const expanded = rawPath.replace(/^~(?=\\|\/|$)/, process.env.USERPROFILE || "~");
  const absolute = path.win32.resolve(expanded);

  if (absolute.includes("\0")) {
    throw new Error("Path contains invalid characters.");
  }

  return absolute;
}

function resolveTargetPath(input) {
  return normalizeWindowsPath(decodeInputPath(input));
}

function ensureExists(targetPath) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Path does not exist: ${targetPath}`);
  }

  debugLog("exists", targetPath);
}

function isDirectory(targetPath) {
  return fs.statSync(targetPath).isDirectory();
}

function createOpenUrl(rawPath, options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = Number(options.port || DEFAULT_PORT);
  const token = options.token === undefined ? API_TOKEN : options.token;
  const params = new URLSearchParams();

  params.set("path", rawPath);
  if (token) {
    params.set("token", token);
  }

  return `http://${host}:${port}/open?${params.toString()}`;
}

function focusExplorerWindow(targetPath) {
  const helperPath = findNativeFocusHelper();
  if (helperPath) {
    debugLog("focus-helper-native", helperPath, "target", targetPath);
    const child = spawn(helperPath, [
      targetPath
    ], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });

    child.unref();
    return;
  }

  const encodedCommand = Buffer.from(buildFocusScript(targetPath), "utf16le").toString("base64");
  debugLog("focus-script", "powershell", "target", targetPath);
  const child = spawn("powershell.exe", [
    "-NoProfile",
    "-WindowStyle",
    "Hidden",
    "-EncodedCommand",
    encodedCommand
  ], {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });

  child.unref();
}

function findNativeFocusHelper() {
  const candidates = process.pkg
    ? [
        path.join(path.dirname(process.execPath), "Linksy.FocusHelper.exe")
      ]
    : [
        path.join(__dirname, "..", "native", "Linksy.FocusHelper", "bin", "Release", "net9.0-windows", "win-x64", "publish", "Linksy.FocusHelper.exe"),
        path.join(__dirname, "..", "native", "Linksy.FocusHelper", "bin", "Release", "net9.0-windows", "win-x64", "Linksy.FocusHelper.exe"),
        path.join(__dirname, "..", "native", "Linksy.FocusHelper", "bin", "Release", "net9.0-windows", "publish", "Linksy.FocusHelper.exe"),
        path.join(__dirname, "..", "native", "Linksy.FocusHelper", "bin", "Release", "net9.0-windows", "Linksy.FocusHelper.exe")
      ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function buildFocusScript(targetPath) {
  const escapedPath = escapePowerShellSingleQuoted(targetPath);

  return `
$ErrorActionPreference = 'Stop'
$targetPath = '${escapedPath}'

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32 {
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool BringWindowToTop(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool IsIconic(IntPtr hWnd);
}
"@

function Normalize-PathForMatch([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return "" }
  return $value.TrimEnd('\').ToLowerInvariant()
}

function Get-ExplorerPath($window) {
  try {
    if ($window.Document -and $window.Document.Folder -and $window.Document.Folder.Self) {
      return $window.Document.Folder.Self.Path
    }
  } catch {}

  try {
    if ($window.LocationURL) {
      return [Uri]::UnescapeDataString($window.LocationURL.Replace('file:///', '').Replace('/', '\\'))
    }
  } catch {}

  return ""
}

$shell = New-Object -ComObject Shell.Application
$wscript = New-Object -ComObject WScript.Shell
$targetNormalized = Normalize-PathForMatch $targetPath
$parentNormalized = Normalize-PathForMatch ([System.IO.Path]::GetDirectoryName($targetPath))

for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep -Milliseconds 250

  foreach ($window in $shell.Windows()) {
    $windowPath = Normalize-PathForMatch (Get-ExplorerPath $window)
    if (-not $windowPath) { continue }

    if ($windowPath -eq $targetNormalized -or $windowPath -eq $parentNormalized) {
      try {
        $hwnd = [IntPtr]::new([int64]$window.HWND)
        $wscript.SendKeys('%')
        if ([Win32]::IsIconic($hwnd)) {
          [Win32]::ShowWindowAsync($hwnd, 9) | Out-Null
        } else {
          [Win32]::ShowWindowAsync($hwnd, 5) | Out-Null
        }
        [Win32]::BringWindowToTop($hwnd) | Out-Null
        [Win32]::ShowWindowAsync($hwnd, 9) | Out-Null
        [Win32]::SetForegroundWindow($hwnd) | Out-Null
        try { $window.Visible = $true } catch {}
        try { $window.Document.Focus() } catch {}
        try { $wscript.AppActivate([int]$window.HWND) | Out-Null } catch {}
        exit 0
      } catch {}
    }
  }
}
`.trim();
}

function escapePowerShellSingleQuoted(value) {
  return String(value).replace(/'/g, "''");
}

function openWithPowerShell(targetPath) {
  const isFolder = isDirectory(targetPath);
  const escapedPath = escapePowerShellSingleQuoted(targetPath);
  const command = isFolder
    ? `$ErrorActionPreference='Stop'; Start-Process -FilePath explorer.exe -ArgumentList @('${escapedPath}') | Out-Null`
    : `$ErrorActionPreference='Stop'; Start-Process -FilePath explorer.exe -ArgumentList @('/select,', '${escapedPath}') | Out-Null`;
  debugLog("open-explorer-powershell", command);

  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-WindowStyle",
    "Hidden",
    "-Command",
    command
  ], {
    stdio: "ignore",
    windowsHide: true
  });

  if (result.status !== 0) {
    debugLog("open-explorer-powershell-failed", String(result.status));
    throw new Error("Failed to launch Explorer.");
  }
}

function openInExplorerForeground(targetPath) {
  debugLog("open-in-explorer-foreground", targetPath);
  openWithPowerShell(targetPath);
  focusExplorerWindow(targetPath);
}

module.exports = {
  API_TOKEN,
  DEFAULT_HOST,
  DEFAULT_PORT,
  createOpenUrl,
  decodeInputPath,
  ensureExists,
  isDirectory,
  normalizeWindowsPath,
  openInExplorerForeground,
  resolveTargetPath
};
