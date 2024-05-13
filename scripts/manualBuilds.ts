import type { cros_build, cros_target } from "../lib/index.js";
import { insertManyBuilds, insertManyTargets } from "./dbOp.js";

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
  {
    channel: "stable-channel",
    chrome: "104.0.5112.83",
    platform: "14909.100.0",
  },
  {
    channel: "stable-channel",
    chrome: "101.0.4951.72",
    platform: "14588.123.0",
  },
  {
    channel: "stable-channel",
    chrome: "99.0.4844.94",
    platform: "14469.59.0",
  },
  {
    channel: "stable-channel",
    chrome: "97.0.4692.77",
    platform: "14324.62.0",
  },
  {
    channel: "stable-channel",
    chrome: "93.0.4577.107",
    platform: "14092.77.0",
  },
  {
    channel: "stable-channel",
    chrome: "88.0.4324.208",
    platform: "13597.105.0",
  },
  {
    channel: "stable-channel",
    chrome: "75.0.3770.129",
    platform: "12105.90.0",
  },
  {
    channel: "stable-channel",
    chrome: "63.0.3239.140",
    platform: "10032.86.0",
  },
];

const targets: cros_target[] = [
  { board: "x86-alex", mp_token: "alex-mp", mp_key_max: 4 },
  { board: "x86-zgb", mp_token: "zgb-mp", mp_key_max: 3 },
];

console.log("Found", builds.length, "builds");
console.log("Found", targets.length, "targets");

insertManyBuilds(builds);
insertManyTargets(targets);
