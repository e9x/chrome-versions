import { chromeDBPath } from "../lib/db.js";
import type { cros_target } from "../lib/index";
import bruteforce from "./bruteforceLib.js";
import Database from "better-sqlite3";

const db = new Database(chromeDBPath);

const getTarget = db.prepare("SELECT * FROM cros_target;");
const getImages = db.prepare<[board: string]>(
  "SELECT count(*) FROM cros_recovery_image WHERE board = ?;"
);

const targets = getTarget.all() as cros_target[];

for (const target of targets) {
  const { "count(*)": imageCount } = getImages.get(target.board) as {
    "count(*)": number;
  };

  /*if (imageCount !== 0) {
    console.log(
      target.board,
      "already has",
      imageCount,
      "images scraped, skipping..."
    );
    continue;
  }*/

  console.log("Bruteforcing", target.board);
  await bruteforce(target.board);
}
