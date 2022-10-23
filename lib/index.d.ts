export const chromeDBPath: string;

/**
 * Release channel
 * @see {@link https://source.chromium.org/chromiumos/chromiumos/codesearch/+/main:gen/arm-generic/chroot/build/arm-generic/usr/share/protofiles/chrome_device_policy.proto;drc=e531e3b49389e722fca84e2a8a8dfa7df591c01f;l=90}
 */
export type cros_channel = "stable-channel" | "beta-channel" | "dev-channel";

/**
 * @see {@link|https://www.chromium.org/chromium-os/firmware-porting-guide/2-concepts/#firmware-development}
 */
export interface cros_recovery_image {
  /** Board codename */
  board: string;
  /** CrOS platform version (e.g. 15117.41.0) */
  platform: string;
  /** Mass production (MP) keys - secret keys */
  mp_key: number;
  channel: cros_channel;
}

export interface cros_build {
  /** CrOS platform version (e.g. 15117.41.0) */
  platform: string;
  /** Chrome version (e.g. 107.0.5304.32) */
  chrome: string;
  channel: cros_channel;
  /* Date released in ISO format */
  date: string;
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

export const isValidBuild: (build: unknown) => build is cros_build;
