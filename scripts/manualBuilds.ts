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
  {
    channel: "stable-channel",
    chrome: "64.0.3279.0",
    platform: "10176.76.0",
  },
  {
    channel: "stable-channel",
    chrome: "75.0.3770.144",
    platform: "12105.100.1",
  },
  {
    channel: "stable-channel",
    chrome: "76.0.3809.102",
    platform: "12239.67.0",
  },
  {
    channel: "stable-channel",
    chrome: "77.0.3865.105",
    platform: "12371.75.1",
  },
  {
    channel: "stable-channel",
    chrome: "84.0.4147.127",
    platform: "13099.102.0",
  },
  {
    channel: "stable-channel",
    chrome: "87.0.4280.152",
    platform: "13505.111.0",
  },
];

console.log("Found", builds.length, "builds");

insertManyBuilds(builds);
