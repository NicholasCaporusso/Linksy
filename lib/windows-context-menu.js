const { spawnSync } = require("child_process");

const CONTEXT_MENU_KEY_NAMES = [
  "NotionPathOpener",
  "Linksy",
  "LinksyContextMenu",
  "GetLinksyLink"
];

const ACTIVE_ITEM_MENU_KEYS = [
  "HKCU\\Software\\Classes\\*\\shell\\NotionPathOpener",
  "HKCU\\Software\\Classes\\Directory\\shell\\NotionPathOpener"
];

const ACTIVE_BACKGROUND_MENU_KEYS = [
  "HKCU\\Software\\Classes\\Directory\\Background\\shell\\NotionPathOpener"
];

const ITEM_MENU_ROOTS = [
  "HKCU\\Software\\Classes\\*\\shell",
  "HKCU\\Software\\Classes\\Directory\\shell",
  "HKCU\\Software\\Classes\\Folder\\shell",
  "HKCU\\Software\\Classes\\AllFilesystemObjects\\shell"
];

const BACKGROUND_MENU_ROOTS = [
  "HKCU\\Software\\Classes\\Directory\\Background\\shell"
];

function buildKeyList(roots) {
  return roots.flatMap((root) => CONTEXT_MENU_KEY_NAMES.map((name) => `${root}\\${name}`));
}

const ITEM_MENU_KEYS = buildKeyList(ITEM_MENU_ROOTS);
const BACKGROUND_MENU_KEYS = buildKeyList(BACKGROUND_MENU_ROOTS);

function runReg(args) {
  const result = spawnSync("reg.exe", args, {
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`Registry command failed: reg ${args.join(" ")}`);
  }
}

function writeMenuKeys(keys, { commandValue, iconValue, label }) {
  for (const key of keys) {
    runReg(["add", key, "/ve", "/d", label, "/f"]);
    runReg(["add", key, "/v", "Icon", "/d", iconValue, "/f"]);
    runReg(["add", `${key}\\command`, "/ve", "/d", commandValue, "/f"]);
  }
}

function writeContextMenuRegistry({ commandValue, backgroundCommandValue, iconValue, label }) {
  removeContextMenuRegistry();

  writeMenuKeys(ACTIVE_ITEM_MENU_KEYS, { commandValue, iconValue, label });
  writeMenuKeys(ACTIVE_BACKGROUND_MENU_KEYS, {
    commandValue: backgroundCommandValue,
    iconValue,
    label
  });
}

function contextMenuRegistryExists() {
  for (const key of [...ACTIVE_ITEM_MENU_KEYS, ...ACTIVE_BACKGROUND_MENU_KEYS]) {
    const result = spawnSync("reg.exe", ["query", key], {
      stdio: "ignore"
    });

    if (result.status !== 0) {
      return false;
    }
  }

  return true;
}

function removeContextMenuRegistry() {
  for (const key of [...ITEM_MENU_KEYS, ...BACKGROUND_MENU_KEYS]) {
    const result = spawnSync("reg.exe", ["delete", key, "/f"], {
      stdio: "ignore"
    });

    if (result.status !== 0 && result.status !== 2 && result.status !== 1) {
      throw new Error(`Failed to remove registry key: ${key}`);
    }
  }
}

module.exports = {
  contextMenuRegistryExists,
  removeContextMenuRegistry,
  writeContextMenuRegistry
};
