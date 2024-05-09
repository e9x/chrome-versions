/*
 * This script contains libraries intended to be used in any JavaScript environment.
 */

/**
 * Release channel
 * @see {@link https://source.chromium.org/chromiumos/chromiumos/codesearch/+/main:src/chromium/src/components/policy/proto/chrome_device_policy.proto}
 */
export type cros_channel =
  | "stable-channel"
  | "beta-channel"
  | "dev-channel"
  | "ltc-channel"
  | "lts-channel";

export interface cros_build {
  /** CrOS platform version (e.g. 15117.41.0) */
  platform: string;
  /** Chrome version (e.g. 107.0.5304.32) */
  chrome: string;
  channel: cros_channel;
}

/**
 * array of valid release channel IDs
 */
export const validChannels: cros_channel[];

/**
 * parsed recovery image url
 * @see {@link|https://www.chromium.org/chromium-os/firmware-porting-guide/2-concepts/#firmware-development}
 */
export interface cros_recovery_image {
  /** CrOS platform version (e.g. 15117.41.0) */
  platform: string;
  /** Board codename */
  board: string;
  /**
   * release channel id
   */
  channel: cros_channel;
  /**
   * Mass production (MP) keys - secret keys. When mp_key === 1, it's version will not be specified in a URL.
   * Anything higher than 1 will show as mp-v$
   * MP keys will always start at 1.
   */
  mp_key: number;
  /**
   * @see {cros_target["mp_token"]}
   */
  mp_token: string;
}

/**
 * recovery image database row
 */
export interface cros_recovery_image_db extends cros_recovery_image {
  chrome: string;
  /** ISO string of the `last-modified` header received when fetching the image. This is irrelevant unless the value is being read/written to a database. */
  last_modified: string;
}

export interface bruteforce_attempt {
  board: string;
  platform: string;
  mp_key: number;
}

export interface cros_brand {
  /** The name of the Chromebook model (e.g. Lenovo N22) */
  brand: string;
  /** Codename */
  board: string;
}

export interface cros_target {
  /** Codename for the board/target */
  board: string;
  // Knowing the mass production keys helps with bruteforcing recovery URLs, reducing the requests by 20x
  /** The highest value of the mass-production keys */
  mp_key_max: number;
  /**
   * Older boards have custom prefixes before `mp` in the URL. See https://dl.google.com/dl/edgedl/chromeos/recovery/chromeos_9334.72.0_x86-zgb-he_recovery_stable-channel_zgb-mp-v3.bin.zip
   */
  mp_token: string;
  /** The lowest value of the mass-production keys */
  // this is harder to find and unreasonable to expect for every board!
  // mpMin: number;
}

/**
 *
 * @param image
 * @param secure May be faster to insecurely request this board (e.g. scraping)
 * @returns Absolute URL to download the recovery image.
 */
export const getRecoveryURL: (
  image: cros_recovery_image,
  secure?: boolean,
) => string;

/**
 *
 * @param url
 * @returns Recovery image
 */
export const parseRecoveryURL: (url: string) => cros_recovery_image;

export const isValidBuild: (build: unknown) => build is cros_build;

/**
 * @see {@link|https://www.chromium.org/developers/version-numbers/}
 */
export const parseChromeVersion: (
  version: string,
) => [major: number, minor: number, build: number, patch: number];

/**
 * @see {@link|https://www.chromium.org/developers/version-numbers/}
 */
export const parsePlatformVersion: (
  version: string,
) => [tip: number, build: number, subbranch: number];
