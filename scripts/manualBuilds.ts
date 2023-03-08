import type { cros_build } from "../lib/index.js";
import { insertManyBuilds } from "./dbOp.js";

const builds: cros_build[] = [
  {
    // https://github.com/e9x/chrome100/issues/9
    channel: "stable-channel",
    chrome: "87.0.4280.109",
    platform: "13505.73.0",
  },
  {
    channel: "stable-channel",
    chrome: "87.0.4280.109",
    platform: "13099.102.0",
  },
  {
    channel: "stable-channel",
    chrome: "87.0.4280.109",
    platform: "12239.67.0",
  },
  {
    channel: "stable-channel",
    chrome: "87.0.4280.109",
    platform: "12371.75.1",
  },
];

console.log("Found", builds.length, "builds");

insertManyBuilds(builds);
