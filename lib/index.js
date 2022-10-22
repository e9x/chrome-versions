"use strict"; 
const path = require("node:path");

/**
 * @typedef {import("./index").cros_recovery_image} cros_recovery_image
 */

/**
 * @typedef {import("./index").cros_build} cros_build
 */

const chromeDBPath = path.join(__dirname, "..", "dist", "chrome.db");
exports.chromeDBPath = chromeDBPath;

/**
 * 
 * @param {cros_recovery_image} image 
 * @param {boolean} [secure] May be faster to insecurely request this board (e.g. scraping)
 * @returns Absolute URL to download the recovery image.
 */
const getRecoveryURL = (image, secure = true) =>
  `http${
    secure ? "s" : ""
  }://dl.google.com/dl/edgedl/chromeos/recovery/chromeos_${image.platform}_${
    image.board
  }_recovery_${image.channel}_${
    image.mp_key === 0 ? "mp" : `mp-v${image.mp_key}`
  }.bin.zip`;
exports.getRecoveryURL = getRecoveryURL;

/**
 * 
 * @param {unknown} build 
 * @returns {build is cros_build}
 */
const isValidBuild = (build) => typeof build === "object" && typeof build.platform === "string" && typeof build.chrome === "string" && (build.channel === "stable-channel" | build.channel === "beta-channel" | build.channel === "dev-channel");
exports.isValidBuild = isValidBuild;