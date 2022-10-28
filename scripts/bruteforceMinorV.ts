import type { cros_recovery_image } from "../lib/index";
import { getRecoveryURL } from "../lib/index.js";
import fetch from "node-fetch";

interface ResolvedData {
  image: cros_recovery_image;
  lastModified: number;
}

const execute: (() => Promise<ResolvedData>)[][] = [];

for (let i = 0; i < 150; i++) {
  const executeI = Math.floor(i / 10);

  if (execute.length < executeI + 1) execute.push([]);

  const set = execute[executeI];

  set.push(async () => {
    const image = {
      board: "hatch",
      platform: `14263.${i}.0`,
      mp_key: 6,
      channel: "dev-channel",
    } as cros_recovery_image;

    const url = getRecoveryURL(image, false);
    const res = await fetch(url, { method: "HEAD" });

    if (res.status === 404) throw new Error("Not Found");
    else if (!res.ok) {
      console.error(res.status, res.statusText, image);
      throw new Error(`Unknown error: ${res.status}`);
    }

    return {
      image,
      lastModified: new Date(res.headers.get("last-modified") || "").getTime(),
    };
  });
}

for (const set of execute) {
  for (const res of await Promise.allSettled(set.map((s) => s()))) {
    if (res.status === "rejected") continue;
    console.log(res.value, getRecoveryURL(res.value.image));
  }
}
