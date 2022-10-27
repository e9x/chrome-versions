/*
 * This script contains libraries intended to be used in any JavaScript environment.
 */

/**
 * Release channel
 * @see {@link https://source.chromium.org/chromiumos/chromiumos/codesearch/+/main:gen/arm-generic/chroot/build/arm-generic/usr/share/protofiles/chrome_device_policy.proto;drc=e531e3b49389e722fca84e2a8a8dfa7df591c01f;l=90}
 */
export type cros_channel = "stable-channel" | "beta-channel" | "dev-channel";

export interface cros_build {
  /** CrOS platform version (e.g. 15117.41.0) */
  platform: string;
  /** Chrome version (e.g. 107.0.5304.32) */
  chrome: string;
  channel: cros_channel;
}

/**
 * @see {@link|https://www.chromium.org/chromium-os/firmware-porting-guide/2-concepts/#firmware-development}
 */
export interface cros_recovery_image extends cros_build {
  /** Board codename */
  board: string;
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

export interface cros_recovery_image_db extends cros_recovery_image {
  /** ISO string of the `last-modified` header received when fetching the image. This is irrelevant unless the value is being read/written to a database. */
  last_modified?: string;
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
  secure?: boolean
) => string;

/**
 *
 * @param url
 * @returns Recovery image
 */
export const parseRecoveryURL: (url: string) => cros_recovery_image;

export const isValidBuild: (build: unknown) => build is cros_build;
