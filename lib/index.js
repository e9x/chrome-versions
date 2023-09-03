/**
 * @typedef {import("./index").cros_recovery_image} cros_recovery_image
 */

/**
 * @typedef {import("./index").cros_build} cros_build
 */

/**
 *
 * @param {cros_recovery_image} image
 * @param {boolean} [secure] May be faster to insecurely request this board (e.g. scraping)
 * @returns {string} Absolute URL to download the recovery image.
 */
export const getRecoveryURL = (image, secure = true) =>
  `http${
    secure ? "s" : ""
  }://dl.google.com/dl/edgedl/chromeos/recovery/chromeos_${image.platform}_${
    image.board
  }_recovery_${image.channel}_${image.mp_token}${
    image.mp_key === 1 ? "" : `-v${image.mp_key}`
  }.bin.zip`;

/**
 *
 * @param {string} url
 * @returns {cros_recovery_image} Absolute URL to download the recovery image.
 */
export const parseRecoveryURL = (url) => {
  const startI = url.indexOf("/recovery/chromeos_");
  if (startI === -1) throw new TypeError("Bad recovery image URL");
  const binName = url.slice(startI);
  const match = binName.match(
    /chromeos_([\d.]+)_([\w-]+)_recovery_(stable|beta|dev)-channel_([\w-]+-mp|mp)(-v[1-9][0-9]*)?\.bin\.zip/,
  );
  if (!match) throw new TypeError("Bad recovery image URL");
  const [, platform, codename, channel, mp_token, mp_key] = match;
  return {
    mp_key: typeof mp_key === "string" ? parseInt(mp_key.slice(2)) : 1,
    mp_token,
    board: codename,
    channel,
    platform,
  };
};

/**
 *
 * @param {unknown} build
 * @returns {build is cros_build}
 */
export const isValidBuild = (build) =>
  typeof build === "object" &&
  typeof build.platform === "string" &&
  typeof build.chrome === "string" &&
  (build.channel === "stable-channel") |
    (build.channel === "beta-channel") |
    (build.channel === "dev-channel");

const whitespace = /\s/;

/**
 * @param {string} version
 * @see {@link|https://www.chromium.org/developers/version-numbers/}
 */
export const parseChromeVersion = (version) => {
  if (whitespace.test(version)) throw new Error("Version contained whitespace");
  const split = version.split(".").map((x) => Number(x));
  if (split.length !== 4 || split.some(isNaN))
    throw new Error("Invalid Chrome version");
  return split;
};

/**
 * @param {string} version
 * @see {@link|https://www.chromium.org/developers/version-numbers/}
 */
export const parsePlatformVersion = (version) => {
  if (whitespace.test(version)) throw new Error("Version contained whitespace");
  const split = version.split(".").map((x) => Number(x));
  if (split.length !== 3 || split.some(isNaN))
    throw new Error("Invalid platform version");
  return split;
};
