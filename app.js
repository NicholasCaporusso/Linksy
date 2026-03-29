const { runCli } = require("./cli");
const { startServer } = require("./server");

async function main() {
  const command = process.argv[2];

  if (!command || command === "serve") {
    await startServer();
    return;
  }

  await runCli(process.argv.slice(2));
}

main().catch((error) => {
  console.error(error.message || "Unexpected error.");
  process.exit(1);
});
