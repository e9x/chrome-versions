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
  /**
   * Mass production (MP) keys - secret keys. When mp_key === 1, it's version will not be specified in a URL.
   * Anything higher than 1 will show as mp-v$
   * MP keys will always start at 1.
   */
  mp_key: number;
  channel: cros_channel;
}

export interface cros_build {
  /** CrOS platform version (e.g. 15117.41.0) */
  platform: string;
  /** Chrome version (e.g. 107.0.5304.32) */
  chrome: string;
  channel: cros_channel;
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
