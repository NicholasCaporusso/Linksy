const fs = require("fs");
const net = require("net");
const path = require("path");

const PREFERRED_PORT = 54657;
const PORT_SEARCH_SPAN = 20;

function getDataDirectory() {
  const localAppData = process.env.LOCALAPPDATA
    || path.join(process.env.USERPROFILE || ".", "AppData", "Local");

  return path.join(localAppData, "Linksy");
}

function getPortFilePath() {
  return path.join(getDataDirectory(), "port.txt");
}

function ensureDataDirectory() {
  fs.mkdirSync(getDataDirectory(), { recursive: true });
}

function readStoredPort() {
  try {
    const raw = fs.readFileSync(getPortFilePath(), "utf8").trim();
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeStoredPort(port) {
  ensureDataDirectory();
  fs.writeFileSync(getPortFilePath(), String(port), "utf8");
}

function isPortAvailable(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const probe = net.createServer();

    probe.once("error", () => resolve(false));
    probe.once("listening", () => {
      probe.close(() => resolve(true));
    });

    probe.listen(port, host);
  });
}

async function resolveRuntimePort(host = "127.0.0.1") {
  if (process.env.PORT) {
    return Number(process.env.PORT);
  }

  const storedPort = readStoredPort();
  const candidates = [PREFERRED_PORT];

  if (storedPort && storedPort !== PREFERRED_PORT) {
    candidates.push(storedPort);
  }

  for (let index = 0; index < PORT_SEARCH_SPAN; index += 1) {
    const candidate = PREFERRED_PORT + index;
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  }

  for (const candidate of candidates) {
    if (await isPortAvailable(candidate, host)) {
      writeStoredPort(candidate);
      return candidate;
    }
  }

  throw new Error(`Could not find a free Linksy port starting at ${PREFERRED_PORT}.`);
}

function getPreferredPort() {
  if (process.env.PORT) {
    return Number(process.env.PORT);
  }

  return readStoredPort() || PREFERRED_PORT;
}

module.exports = {
  PREFERRED_PORT,
  getDataDirectory,
  getPortFilePath,
  getPreferredPort,
  readStoredPort,
  resolveRuntimePort,
  writeStoredPort
};
