const http = require("http");
const fs = require("fs");
const path = require("path");
const {
  API_TOKEN,
  DEFAULT_HOST,
  createOpenUrl,
  ensureExists,
  openInExplorerForeground,
  resolveTargetPath
} = require("./lib/notion-path-opener");
const { resolveRuntimePort } = require("./lib/runtime-config");

const HOST = DEFAULT_HOST;
const DEBUG_LINKSY = process.env.LINKSY_DEBUG === "1";
const EMBEDDED_LINKSY_IMAGE = loadEmbeddedImageDataUri();
const RUNTIME_ICON_PATH = resolveRuntimeAssetPath("icon.ico");

function debugLog(...parts) {
  if (!DEBUG_LINKSY) {
    return;
  }

  console.log("[Linksy]", ...parts);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(html);
}

function sendFile(res, statusCode, filePath, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=3600"
  });
  fs.createReadStream(filePath).pipe(res);
}

function resolveRuntimeAssetPath(...segments) {
  if (process.pkg) {
    return path.join(path.dirname(process.execPath), ...segments);
  }

  return path.join(__dirname, ...segments);
}

function loadEmbeddedImageDataUri() {
  try {
    const imageBuffer = fs.readFileSync(resolveRuntimeAssetPath("doc", "icon.png"));
    return `data:image/png;base64,${imageBuffer.toString("base64")}`;
  } catch {
    return "";
  }
}

function requireToken(urlObj) {
  if (!API_TOKEN) {
    debugLog("token-check", "disabled");
    return;
  }

  const provided = urlObj.searchParams.get("token") || "";
  debugLog("token-check", `provided=${provided}`, `expected=${API_TOKEN}`);
  if (provided !== API_TOKEN) {
    const err = new Error("Invalid token.");
    err.statusCode = 403;
    throw err;
  }
}

function buildBaseUrl(req) {
  const hostHeader = req.headers.host || `${HOST}:${req.socket.localPort}`;
  return `http://${hostHeader}`;
}

function buildLaunchUrl(baseUrl, rawPath) {
  const params = new URLSearchParams();
  params.set("path", rawPath);
  if (API_TOKEN) {
    params.set("token", API_TOKEN);
  }
  return `${baseUrl}/launch?${params.toString()}`;
}

function renderHomePage(req) {
  const baseUrl = buildBaseUrl(req);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Linksy</title>
  <style>
    :root {
      --bg: #f3efe7;
      --panel: #fffdf8;
      --text: #1f1d1a;
      --muted: #5d554d;
      --accent: #0d5c63;
      --accent-2: #f0b429;
      --border: #d9d0c2;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(240,180,41,0.18), transparent 28%),
        linear-gradient(135deg, #f6f0e2, var(--bg));
      min-height: 100vh;
      padding: 24px;
    }
    .shell {
      max-width: 880px;
      margin: 0 auto;
      background: rgba(255, 253, 248, 0.92);
      border: 1px solid var(--border);
      border-radius: 18px;
      box-shadow: 0 18px 50px rgba(54, 42, 28, 0.12);
      overflow: hidden;
    }
    .hero {
      padding: 28px 28px 20px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(135deg, rgba(13,92,99,0.08), rgba(240,180,41,0.08));
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 10px;
    }
    .brand img {
      width: 84px;
      height: 84px;
      object-fit: contain;
      border-radius: 18px;
      box-shadow: 0 10px 24px rgba(18, 38, 63, 0.12);
      background: rgba(255,255,255,0.75);
      padding: 8px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: clamp(28px, 5vw, 42px);
      line-height: 1.05;
    }
    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
    }
    .content {
      padding: 28px;
      display: grid;
      gap: 18px;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
    }
    input, textarea, button {
      width: 100%;
      font: inherit;
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    input, textarea {
      padding: 14px 16px;
      background: #fff;
    }
    textarea {
      min-height: 120px;
      resize: vertical;
    }
    button {
      cursor: pointer;
      padding: 14px 18px;
      background: var(--accent);
      color: #fff;
      border: none;
      font-weight: 700;
    }
    button.secondary {
      background: #fff;
      color: var(--accent);
      border: 1px solid var(--accent);
    }
    .row {
      display: grid;
      gap: 12px;
      grid-template-columns: 1fr;
    }
    .note {
      padding: 14px 16px;
      border-left: 4px solid var(--accent-2);
      background: rgba(240, 180, 41, 0.12);
      color: #59451b;
    }
    code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.95em;
    }
    @media (min-width: 720px) {
      .row.two {
        grid-template-columns: 1fr auto auto;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="brand">
        ${EMBEDDED_LINKSY_IMAGE ? `<img src="${EMBEDDED_LINKSY_IMAGE}" alt="Linksy logo">` : ""}
        <h1>Linksy</h1>
      </div>
      <p>Create a localhost Linksy URL for any Windows file or folder, then paste that link into Notion. When you click it, Explorer opens the target on this machine.</p>
    </section>
    <section class="content">
      <div>
        <label for="sourcePath">Windows path or file:// URL</label>
        <textarea id="sourcePath" placeholder="C:\\Users\\User\\Desktop\\notes&#10;C:\\Users\\User\\Desktop\\notes\\todo.txt"></textarea>
      </div>
      <div>
        <label for="generatedLink">Generated localhost link</label>
        <textarea id="generatedLink" readonly></textarea>
      </div>
      <div class="row two">
        <button id="generateBtn" type="button">Generate link</button>
        <button id="copyBtn" class="secondary" type="button">Copy link</button>
        <button id="openBtn" class="secondary" type="button">Open target now</button>
      </div>
      <div class="note">
        Base URL: <code>${escapeHtml(baseUrl)}</code><br>
        Open endpoint: <code>${escapeHtml(`${baseUrl}/open?path=...`)}</code><br>
        Explorer context menu: <code>npm run install-context-menu</code>
      </div>
    </section>
  </main>
  <script>
    const sourcePath = document.getElementById("sourcePath");
    const generatedLink = document.getElementById("generatedLink");
    const generateBtn = document.getElementById("generateBtn");
    const copyBtn = document.getElementById("copyBtn");
    const openBtn = document.getElementById("openBtn");
    const host = ${JSON.stringify(HOST)};
    const port = ${JSON.stringify(req.socket.localPort)};
    const token = ${JSON.stringify(API_TOKEN)};

    function createLink(rawPath) {
      const params = new URLSearchParams();
      params.set("path", rawPath.trim());
      if (token) {
        params.set("token", token);
      }
      return "http://" + host + ":" + port + "/open?" + params.toString();
    }

    function refreshOutput() {
      const value = sourcePath.value.trim();
      generatedLink.value = value ? createLink(value) : "";
    }

    generateBtn.addEventListener("click", refreshOutput);
    sourcePath.addEventListener("input", refreshOutput);

    copyBtn.addEventListener("click", async () => {
      if (!generatedLink.value) {
        return;
      }

      await navigator.clipboard.writeText(generatedLink.value);
    });

    openBtn.addEventListener("click", () => {
      if (!generatedLink.value) {
        return;
      }

      window.open(generatedLink.value, "_blank", "noopener,noreferrer");
    });
  </script>
</body>
</html>`;
}

function renderOpenPage(req, rawPath, targetPath) {
  const baseUrl = buildBaseUrl(req);
  const launchUrl = buildLaunchUrl(baseUrl, rawPath);
  const description = `Link to ${targetPath}`;
  const embeddedImage = EMBEDDED_LINKSY_IMAGE;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Linksy</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="Linksy">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  ${embeddedImage ? `<meta property="og:image" content="${embeddedImage}">` : ""}
  <meta property="og:url" content="${escapeHtml(`${baseUrl}/open?path=${encodeURIComponent(rawPath)}${API_TOKEN ? `&token=${encodeURIComponent(API_TOKEN)}` : ""}`)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Linksy">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${embeddedImage ? `<meta name="twitter:image" content="${embeddedImage}">` : ""}
  ${embeddedImage ? `<link rel="icon" href="${embeddedImage}" type="image/png">` : ""}
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f5f7fa;
      color: #1d2733;
      font-family: "Segoe UI", Tahoma, sans-serif;
      padding: 24px;
    }
    .card {
      max-width: 720px;
      width: 100%;
      background: #fff;
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 18px 40px rgba(18, 38, 63, 0.12);
    }
    .hero {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 16px;
    }
    .hero img {
      width: 76px;
      height: 76px;
      object-fit: contain;
      border-radius: 18px;
      background: #f3f7fa;
      padding: 8px;
    }
    h1 { margin-top: 0; }
    h1 { margin-bottom: 0; }
    code {
      display: block;
      padding: 14px;
      border-radius: 12px;
      background: #f2f5f8;
      overflow-wrap: anywhere;
    }
    a {
      display: inline-block;
      margin-top: 18px;
      padding: 12px 16px;
      border-radius: 10px;
      background: #0d5c63;
      color: #fff;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <section class="card">
    <div class="hero">
      ${embeddedImage ? `<img src="${embeddedImage}" alt="Linksy logo">` : ""}
      <h1>Opening with Linksy</h1>
    </div>
    <p>${escapeHtml(description)}</p>
    <code>${escapeHtml(targetPath)}</code>
    <a href="${escapeHtml(launchUrl)}">Open now</a>
  </section>
  <script>
    window.location.replace(${JSON.stringify(launchUrl)});
  </script>
</body>
</html>`;
}

function renderOpenedPage(targetPath) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Opening path</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f5f7fa;
      color: #1d2733;
      font-family: "Segoe UI", Tahoma, sans-serif;
      padding: 24px;
    }
    .card {
      max-width: 720px;
      width: 100%;
      background: #fff;
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 18px 40px rgba(18, 38, 63, 0.12);
    }
    h1 { margin-top: 0; }
    code {
      display: block;
      padding: 14px;
      border-radius: 12px;
      background: #f2f5f8;
      overflow-wrap: anywhere;
    }
  </style>
</head>
<body>
  <section class="card">
    <h1>Linksy opened your path</h1>
    <p>The target was sent to Explorer and the app attempted to bring that window to the foreground.</p>
    <code>${escapeHtml(targetPath)}</code>
  </section>
  <script>
    setTimeout(() => window.close(), 1200);
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function handleOpen(req, res, urlObj) {
  requireToken(urlObj);

  const rawPath = urlObj.searchParams.get("path");
  debugLog("open-request", req.url || "", `rawPath=${rawPath}`);
  const targetPath = resolveTargetPath(rawPath);
  debugLog("open-resolved", targetPath);

  ensureExists(targetPath);
  sendHtml(res, 200, renderOpenPage(req, rawPath, targetPath));
}

function handleLaunch(req, res, urlObj) {
  requireToken(urlObj);

  const rawPath = urlObj.searchParams.get("path");
  debugLog("launch-request", req.url || "", `rawPath=${rawPath}`);
  const targetPath = resolveTargetPath(rawPath);
  debugLog("launch-resolved", targetPath);

  ensureExists(targetPath);
  openInExplorerForeground(targetPath);

  sendHtml(res, 200, renderOpenedPage(targetPath));
}

async function startServer() {
  const port = await resolveRuntimePort(HOST);
  const server = http.createServer((req, res) => {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host || `${HOST}:${port}`}`);
      debugLog("request", req.method || "", req.url || "");

      if (req.method !== "GET") {
        sendJson(res, 405, { error: "Method not allowed." });
        return;
      }

      if (urlObj.pathname === "/") {
        sendHtml(res, 200, renderHomePage(req));
        return;
      }

      if (urlObj.pathname === "/health") {
        sendJson(res, 200, {
          ok: true,
          host: HOST,
          port,
          tokenProtected: Boolean(API_TOKEN),
          sampleUrl: createOpenUrl("C:\\example\\path.txt", { port })
        });
        return;
      }

      if (urlObj.pathname === "/open") {
        handleOpen(req, res, urlObj);
        return;
      }

      if (urlObj.pathname === "/launch") {
        handleLaunch(req, res, urlObj);
        return;
      }

      if (urlObj.pathname === "/icon.ico") {
        sendFile(res, 200, RUNTIME_ICON_PATH, "image/x-icon");
        return;
      }

      sendJson(res, 404, { error: "Not found." });
    } catch (error) {
      debugLog("request-error", error.message || "Unexpected error.");
      const statusCode = error.statusCode || 400;
      sendJson(res, statusCode, {
        error: error.message || "Unexpected error."
      });
    }
  });

  server.listen(port, HOST, () => {
    console.log(`Linksy listening at http://${HOST}:${port}`);
  });

  server.on("error", (error) => {
    if (error && error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use on ${HOST}.`);
      process.exit(1);
    }

    console.error(error.message || "Failed to start the server.");
    process.exit(1);
  });

  return server;
}

module.exports = {
  startServer
};

if (require.main === module) {
  startServer();
}
