import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(frontendDirectory, "dist");
const configuredApiUrl = (process.env.PAGEWISE_API_URL ?? "").trim();

let apiBaseUrl = "";
if (configuredApiUrl) {
  const parsedApiUrl = new URL(configuredApiUrl);
  if (
    !["http:", "https:"].includes(parsedApiUrl.protocol) ||
    parsedApiUrl.username ||
    parsedApiUrl.password ||
    parsedApiUrl.pathname !== "/" ||
    parsedApiUrl.search ||
    parsedApiUrl.hash
  ) {
    throw new Error("PAGEWISE_API_URL must be an HTTP(S) origin without a path.");
  }
  apiBaseUrl = parsedApiUrl.origin;
} else if (process.env.VERCEL === "1") {
  throw new Error("Set PAGEWISE_API_URL to the Render backend URL in Vercel.");
}

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });
for (const fileName of ["index.html", "app.js", "styles.css"]) {
  copyFileSync(
    path.join(frontendDirectory, fileName),
    path.join(outputDirectory, fileName)
  );
}
writeFileSync(
  path.join(outputDirectory, "config.js"),
  `window.PAGEWISE_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};\n`
);
