# Linksy

Linksy is a local Windows helper that turns file and folder paths into localhost URLs you can paste into Notion and other apps. When you click a Linksy link on the same machine, Linksy opens the target in Explorer and tries to bring the Explorer window to the foreground.

**1. Access through context menu**

<img width="287" height="396" alt="image" src="https://github.com/user-attachments/assets/af1921a2-4aa0-4282-8fcc-5a94fee06177" />

**2. Paste into Notion**

<img width="647" height="222" alt="image" src="https://github.com/user-attachments/assets/a3bbbb7b-4c65-4837-8d5d-7b06549b07f0" />

**3. Open as a folder (Explorer dialog)**

<img width="800" height="350" alt="image" src="https://github.com/user-attachments/assets/d9dac185-fc28-476d-a3cd-536765c468f0" />

## Overview

Linksy has four main pieces:

- The main Linksy app: a Node-based local server that generates and handles `http://127.0.0.1:<port>/open?...` links
- The native focus helper: a small Windows executable used to make Explorer foreground activation more reliable
- Explorer shell integration: a right-click menu entry that copies a Linksy URL for a file, folder, or the current folder background
- Windows distribution tools: an installer EXE, a launcher EXE, and an uninstaller EXE

## Default port

Linksy prefers port `54657`.

Behavior:

- If `PORT` is set in the environment, Linksy uses that exact port.
- Otherwise, Linksy tries `54657` first.
- If `54657` is already in use, Linksy searches the next ports upward and stores the chosen port in `%LOCALAPPDATA%\Linksy\port.txt`.
- Once a fallback port is chosen, future generated links use that stored port so the copied URLs stay in sync with the running server.

Files involved:

- Port selection and persistence: [lib/runtime-config.js](lib/runtime-config.js)
- Main app URL generation: [lib/notion-path-opener.js](lib/notion-path-opener.js)
- Server startup: [server.js](server.js)

## What Linksy does

- Accepts Windows paths and `file://` URLs
- Generates localhost URLs like `http://127.0.0.1:54657/open?path=...&token=linksy`
- Opens folders directly in Explorer
- Reveals files in Explorer with Explorer selection behavior
- Exposes preview-friendly metadata and an embedded Linksy image on the `/open` page
- Tries to bring the opened Explorer window to the foreground
- Adds a `Get Linksy link` item to the Explorer context menu

## Quick start for development

1. Install Node.js 18 or newer.
2. Install dependencies:

```powershell
npm install
```

3. Start Linksy:

```powershell
npm start
```

4. Open the local UI in your browser:

```text
http://127.0.0.1:54657
```

5. Paste a Windows path, generate a link, then copy it into Notion.

Check the active server health with:

```powershell
Invoke-WebRequest http://127.0.0.1:54657/health
```

## Example localhost links

Folder:

```text
http://127.0.0.1:54657/open?path=C%3A%5CUsers%5CUser%5CDesktop%5Cfolder&token=linksy
```

File:

```text
http://127.0.0.1:54657/open?path=C%3A%5CUsers%5CUser%5CDesktop%5Cnotes%5Ctodo.txt&token=linksy
```

`file://` input also works once Linksy converts it:

```text
http://127.0.0.1:54657/open?path=file%3A%2F%2F%2FC%3A%2FUsers%2FUser%2FDesktop%2Ffolder&token=linksy
```

## Web UI

When you open `http://127.0.0.1:54657`, Linksy shows a local generator page with:

- an embedded base64 Linksy image loaded from `doc/icon.png`
- a textbox for Windows paths or `file://` URLs
- a generated localhost URL box
- buttons to generate, copy, or open the target immediately

When a browser opens a Linksy URL such as `/open?...`, Linksy shows an "Opening with Linksy" page that also includes the embedded base64 image.

## Link previews

Linksy's `/open` route is preview-safe:

- `/open?...` returns a metadata-rich HTML page
- real browser clicks immediately redirect to `/launch?...`
- `/launch?...` performs the actual Explorer open action

This prevents preview bots from opening Explorer just because they fetched the URL to build a preview card.

Metadata exposed on the `/open` page:

- HTML description: `Link to ${path}`
- `og:title`
- `og:description`
- `twitter:title`
- `twitter:description`
- an embedded Linksy image in the page body

## Explorer context menu

To install the Explorer context menu:

```powershell
npm run install-context-menu
```

To remove it:

```powershell
npm run uninstall-context-menu
```

What it adds:

- Right-click a file: copies a Linksy URL for that file
- Right-click a folder: copies a Linksy URL for that folder
- Right-click the blank background inside a folder: copies a Linksy URL for the current folder path

<img width="287" height="396" alt="image" src="https://github.com/user-attachments/assets/af1921a2-4aa0-4282-8fcc-5a94fee06177" />

The context menu uses:

- label: `Get Linksy link`
- icon: [icon.ico](icon.ico)

Related files:

- CLI and shell command generation: [cli.js](cli.js)
- Registry writes: [lib/windows-context-menu.js](lib/windows-context-menu.js)
- PowerShell wrappers:
  - [scripts/install-context-menu.ps1](scripts/install-context-menu.ps1)
  - [scripts/uninstall-context-menu.ps1](scripts/uninstall-context-menu.ps1)

## Native focus helper

Foreground activation is handled by a small Windows helper that Linksy prefers when it is available.

Project files:

- [native/Linksy.FocusHelper/Linksy.FocusHelper.csproj](native/Linksy.FocusHelper/Linksy.FocusHelper.csproj)
- [native/Linksy.FocusHelper/Program.cs](native/Linksy.FocusHelper/Program.cs)

Build it with:

```powershell
npm run build:focus-helper
```

This produces a native helper EXE under the helper project's publish output.

## Windows EXE tools

Three Windows-native tools are included:

1. `LinksyInstaller.exe`
   Purpose: copies the built Linksy payload into `%LOCALAPPDATA%\Linksy`, registers uninstall information, creates Start Menu shortcuts, optionally creates a desktop shortcut, optionally enables auto-start on login, optionally installs the Explorer context menu, and can launch Linksy immediately.
2. `LinksyLauncher.exe`
   Purpose: starts the installed Linksy server quietly and waits for the local `/health` endpoint to respond.
3. `LinksyUninstaller.exe`
   Purpose: removes the installed app, deletes shortcuts, removes shell integration, and removes uninstall registration.

Projects:

- [native/Linksy.Installer/Linksy.Installer.csproj](native/Linksy.Installer/Linksy.Installer.csproj)
- [native/Linksy.Launcher/Linksy.Launcher.csproj](native/Linksy.Launcher/Linksy.Launcher.csproj)
- [native/Linksy.Uninstaller/Linksy.Uninstaller.csproj](native/Linksy.Uninstaller/Linksy.Uninstaller.csproj)
- Shared install metadata: [native/Linksy.NativeCommon/LinksyInstallInfo.cs](native/Linksy.NativeCommon/LinksyInstallInfo.cs)

Build the Windows tools with:

```powershell
npm run build:windows-tools
```

Important note:

- These tool EXEs are built as self-contained single-file Windows executables.
- They do not require a separate .NET runtime install on the target machine.

## Main app EXE build

The raw Linksy server EXE is built with `pkg`, then post-processed so `dist\linksy.exe` uses the Linksy icon instead of the default Node icon.

Build just the raw app EXE with:

```powershell
npm run build:app-exe
```

Expected output:

```text
dist\linksy.exe
```

This packaged EXE is what the installer copies into `%LOCALAPPDATA%\Linksy`.

## Release bundle build process

Recommended full build order:

```powershell
npm run build:focus-helper
npm run build:app-exe
npm run build:windows-tools
npm run build:bundle
```

Or run the combined shortcut:

```powershell
npm run build:exe
```

What each step does:

1. `build:focus-helper`
   Produces `Linksy.FocusHelper.exe`
2. `build:app-exe`
   Produces `dist\linksy.exe`
3. `build:windows-tools`
   Produces:
   - `LinksyLauncher.exe`
   - `LinksyInstaller.exe`
   - `LinksyUninstaller.exe`
4. `build:bundle`
   Assembles everything into a distributable bundle layout

For convenience, `npm run build:exe` runs the full installer-oriented release flow and leaves the main installer entrypoint at:

```text
dist\LinksyInstaller.exe
```

Build scripts:

- [scripts/build-focus-helper.ps1](scripts/build-focus-helper.ps1)
- [scripts/build-app-exe.ps1](scripts/build-app-exe.ps1)
- [scripts/build-windows-tools.ps1](scripts/build-windows-tools.ps1)
- [scripts/stage-release-bundle.ps1](scripts/stage-release-bundle.ps1)

## Bundle output layout

After `npm run build:bundle`, the staged files are expected in:

```text
dist\bundle\
```

Typical contents:

```text
dist\bundle\LinksyInstaller.exe
dist\bundle\LinksyLauncher.exe
dist\bundle\LinksyUninstaller.exe
dist\bundle\payload\linksy.exe
dist\bundle\payload\Linksy.FocusHelper.exe
dist\bundle\payload\LinksyLauncher.exe
dist\bundle\payload\LinksyUninstaller.exe
dist\bundle\payload\icon.ico
dist\bundle\payload\copy-link-hidden.vbs
```

The top-level convenience copy is also written to:

```text
dist\LinksyInstaller.exe
```

When launching the installer from `dist\LinksyInstaller.exe`, keep the sibling `dist\payload\` directory next to it. The installer can also be launched from `dist\bundle\LinksyInstaller.exe`, where it will use `dist\bundle\payload\`.

## Installation flow

1. Build the release bundle.
2. Distribute the contents of `dist\bundle`.
3. Run `LinksyInstaller.exe`.
4. The installer copies the payload into:

```text
%LOCALAPPDATA%\Linksy
```

Installed app files include:

- `linksy.exe`
- `Linksy.FocusHelper.exe`
- `LinksyLauncher.exe`
- `LinksyUninstaller.exe`
- `icon.ico`
- `copy-link-hidden.vbs`

The installer also writes uninstall registration under:

```text
HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Linksy
```

During installation, the installer now also:

- lets the user browse and choose the install directory
- creates Start Menu shortcuts for `Linksy` and `Uninstall Linksy`
- can create a desktop shortcut for Linksy
- can enable auto-start on login by placing a Linksy shortcut in the user Startup folder
- asks whether it should install the Explorer context menu immediately
- asks whether it should launch Linksy right away
- launches the installed server through `LinksyLauncher.exe` and waits for `/health` to respond

## Launching the installed server

Run:

```text
LinksyLauncher.exe
```

The launcher starts the installed `linksy.exe serve` quietly from `%LOCALAPPDATA%\Linksy`.
If Linksy is already running, the launcher exits without starting a duplicate server.

## Uninstalling

Run:

```text
LinksyUninstaller.exe
```

The uninstaller:

- attempts to remove the Explorer context menu
- removes the Start Menu shortcuts
- removes the desktop shortcut if it exists
- removes the Startup shortcut if it exists
- removes uninstall registration
- kills running installed `linksy.exe` processes
- removes the Linksy install directory

## Optional configuration

- `PORT`
  If set, overrides Linksy's automatic preferred-port selection
- `HOST`
  Defaults to `127.0.0.1`
- `OPEN_PATH_TOKEN`
  Defaults to `linksy`
- `LINKSY_DEBUG`
  Set to `1` to log request and open-path diagnostics

Examples:

```powershell
$env:PORT="54657"
$env:OPEN_PATH_TOKEN="linksy"
$env:LINKSY_DEBUG="1"
npm start
```

## Verification tips

Check health:

```powershell
Invoke-WebRequest http://127.0.0.1:54657/health
```

Print a Linksy URL for a path:

```powershell
node cli.js print "C:\Users\User\Desktop\folder"
```

## Notes

- Linksy is intended for use on the same Windows machine where the target files exist.
- The installer, launcher, and uninstaller are Windows-focused and assume a user-local install under `%LOCALAPPDATA%`.
- The staged bundle depends on the main packaged `dist\linksy.exe` being built successfully before `build:bundle` runs.
