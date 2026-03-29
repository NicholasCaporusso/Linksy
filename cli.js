const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const {
  API_TOKEN,
  DEFAULT_HOST,
  DEFAULT_PORT,
  createOpenUrl,
  ensureExists,
  resolveTargetPath
} = require("./lib/notion-path-opener");
const {
  contextMenuRegistryExists,
  removeContextMenuRegistry,
  writeContextMenuRegistry
} = require("./lib/windows-context-menu");

function printUsage() {
  console.log("Usage:");
  console.log("  node cli.js copy <path>");
  console.log("  node cli.js print <path>");
  console.log("  node cli.js install-context-menu [--yes]");
  console.log("  node cli.js uninstall-context-menu [--yes]");
  console.log("  node cli.js serve");
}

function copyToClipboard(value) {
  const escaped = String(value).replace(/'/g, "''");
  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-WindowStyle",
    "Hidden",
    "-Command",
    `Set-Clipboard -Value '${escaped}'`
  ], {
    stdio: "ignore",
    windowsHide: true
  });

  if (result.status !== 0) {
    throw new Error("Failed to copy the URL to the clipboard.");
  }
}

function getUrlForInput(inputPath) {
  const targetPath = resolveTargetPath(inputPath);
  ensureExists(targetPath);

  return createOpenUrl(targetPath, {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    token: API_TOKEN
  });
}

function isPackagedExecutable() {
  return Boolean(process.pkg);
}

function quoteForWindowsCommand(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function getWscriptPath() {
  return "C:\\Windows\\System32\\wscript.exe";
}

function getHiddenLauncherScriptPath() {
  return path.join(__dirname, "scripts", "copy-link-hidden.vbs");
}

function buildHiddenLauncherCommand(placeholder) {
  if (isPackagedExecutable()) {
    return `${quoteForWindowsCommand(getWscriptPath())} ${quoteForWindowsCommand(path.join(path.dirname(process.execPath), "copy-link-hidden.vbs"))} ${quoteForWindowsCommand(process.execPath)} "" "${placeholder}"`;
  }

  return `${quoteForWindowsCommand(getWscriptPath())} ${quoteForWindowsCommand(getHiddenLauncherScriptPath())} ${quoteForWindowsCommand(process.execPath)} ${quoteForWindowsCommand(path.join(__dirname, "app.js"))} "${placeholder}"`;
}

function getContextMenuCommand() {
  return buildHiddenLauncherCommand("%1");
}

function getBackgroundContextMenuCommand() {
  return buildHiddenLauncherCommand("%V");
}

function getContextMenuIcon() {
  const packagedIconPath = path.join(path.dirname(process.execPath), "icon.ico");
  const repoIconPath = path.join(__dirname, "icon.ico");

  if (isPackagedExecutable()) {
    return fs.existsSync(packagedIconPath) ? packagedIconPath : process.execPath;
  }

  return fs.existsSync(repoIconPath) ? repoIconPath : process.execPath;
}

function askForConfirmation(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return Promise.resolve(null);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${prompt} [y/N] `, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

async function confirmOrThrow(message, autoConfirm) {
  if (autoConfirm) {
    return;
  }

  const confirmed = await askForConfirmation(message);
  if (confirmed === null) {
    throw new Error("Confirmation prompt is not available in this shell. Re-run with --yes or use the PowerShell install script.");
  }

  if (!confirmed) {
    throw new Error("Cancelled without changing the Explorer context menu.");
  }
}

async function installContextMenu(autoConfirm) {
  await confirmOrThrow(
    "This will add 'Get Linksy link' to your Explorer right-click menu for files and folders. Continue?",
    autoConfirm
  );

  writeContextMenuRegistry({
    commandValue: getContextMenuCommand(),
    backgroundCommandValue: getBackgroundContextMenuCommand(),
    iconValue: getContextMenuIcon(),
    label: "Get Linksy link"
  });

  if (!contextMenuRegistryExists()) {
    throw new Error("The context-menu registry keys were not created.");
  }

  console.log("Explorer context menu installed.");
}

async function uninstallContextMenu(autoConfirm) {
  await confirmOrThrow(
    "This will remove 'Get Linksy link' from your Explorer right-click menu. Continue?",
    autoConfirm
  );

  removeContextMenuRegistry();
  console.log("Explorer context menu removed.");
}

async function runCli(argv) {
  const [command, ...rest] = argv;

  if (!command) {
    printUsage();
    process.exit(1);
  }

  const autoConfirm = rest.includes("--yes");
  const pathArgs = rest.filter((arg) => arg !== "--yes");

  if (command === "install-context-menu") {
    await installContextMenu(autoConfirm);
    return;
  }

  if (command === "uninstall-context-menu") {
    await uninstallContextMenu(autoConfirm);
    return;
  }

  if (command === "serve") {
    return;
  }

  const inputPath = pathArgs.join(" ").trim();
  if (!inputPath) {
    throw new Error("A path is required.");
  }

  const url = getUrlForInput(inputPath);

  if (command === "print") {
    console.log(url);
    return;
  }

  if (command === "copy") {
    copyToClipboard(url);
    console.log(`Copied Linksy URL for ${inputPath}`);
    return;
  }

  printUsage();
  process.exit(1);
}

module.exports = {
  runCli
};

if (require.main === module) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(error.message || "Unexpected error.");
    process.exit(1);
  });
}
