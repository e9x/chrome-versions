import { fileURLToPath } from "node:url";

export const chromeDBPath = fileURLToPath(
  new URL("../dist/chrome.db", import.meta.url)
);
