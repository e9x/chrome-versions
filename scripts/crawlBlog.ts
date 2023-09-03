import type { cros_build, cros_channel } from "../lib/index";
import {
  isValidBuild,
  parseChromeVersion,
  parsePlatformVersion,
} from "../lib/index.js";
import type { BloggerPostList } from "./Blogger";
import { insertManyBuilds } from "./dbOp.js";
import fetch from "node-fetch";
import { stripHtml } from "string-strip-html";

// try it: https://developers.google.com/blogger/docs/3.0/reference/posts/list?apix_params=%7B%22blogId%22%3A%228982037438137564684%22%7D

const [, , googleAPIKey] = process.argv;

if (!googleAPIKey) throw new Error("You must specify an API key for blogger.");

const channelNameToId = (name: string) =>
  `${name.toLowerCase()}-channel` as cros_channel;

const testBuild = (build: unknown): build is cros_build => {
  if (!isValidBuild(build))
    throw new Error(`Invalid build: ${JSON.stringify(build)}`);

  try {
    parseChromeVersion(build.chrome);
    parsePlatformVersion(build.platform);
    return true;
  } catch (err) {
    // non-fatal error
    return false;
  }
};

async function* getBlogspot(blogId: string) {
  // if a version is released while we're scraping
  const start = new Date();

  const posts = `https://blogger.googleapis.com/v3/blogs/${blogId}/posts?`;

  let nextPageToken: string | undefined;

  while (true) {
    const params = new URLSearchParams();

    params.set("maxResults", "500");
    params.set("key", googleAPIKey);
    params.set("labels", "Chrome OS");
    params.set("endDate", start.toISOString());
    if (nextPageToken) params.set("pageToken", nextPageToken);

    const url = posts + params;

    const res = await fetch(url);
    if (!res.ok) {
      console.log(await res.json());
      throw new Error(`Error fetching: ${res.status}`);
    }
    const data = (await res.json()) as BloggerPostList;

    if (data.items)
      for (const post of data.items.reverse()) {
        const content = stripHtml(post.content).result.replace(/\s+/g, " ");
        const title = post.title.replace(/\s+/g, " ");

        // not quite updates
        if (
          title ===
            "Long Term Support (LTS) channel for ChromeOS - Major update from 96 -> 102" ||
          title === "Chrome and Chrome OS release updates" ||
          title === "Upcoming Chrome and Chrome OS releases"
        )
          continue;

        if (/long term support (candidate )?(\(lts\) )?channel/i.test(title)) {
          // LTC - Long term candidate
          // on stable channel
          // starting from chrome 96
          // recovery2.json: https://dl.google.com/dl/edgedl/chromeos/recovery/recovery2.json

          // TODO: match LTS-96 has been updated in the LTS channel to 96.0.4664.206 (Platform Version: 14268.81.0) for most ChromeOS devices. Want to know more about Long-term Support? Click here.
          {
            const res = content.match(
              / ([\d.]+) \(platform version: ([\d.]+)\)/i,
            );

            if (res) {
              const [, chrome, platform] = res;

              const build = {
                channel: "stable-channel",
                platform,
                chrome,
              };

              if (testBuild(build)) yield build;

              continue;
            }
          }

          console.log("Could not match LTS", { title, content });
        } else if (
          /(stable|beta|dev) (channels? (updates?|promotion)|update|(channel )?release)/i.test(
            title,
          )
        ) {
          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+) for windows, mac, (?:and linux|linux,)/i,
            );

            // we are missing platform!

            if (res) {
              /*const [, channel, chrome] = res;

              const build = {
                channel: channelNameToId(channel),
                platform,
                chrome,
              };

              if (testBuild(build)) yield build;*/

              continue;
            }
          }

          // newer posts, v113, 112, etc
          // format only used for dev and beta so far
          {
            const res = content.match(
              /The (Dev|Beta) channel is being updated to (?:Chrome)?OS version: ([\d.]+)(?:,| and) Browser version: ([\d.]+)/,
            );

            if (res) {
              const [, channel, platform, chrome] = res;

              const build = {
                channel: channelNameToId(channel),
                platform,
                chrome,
              };

              if (testBuild(build)) yield build;

              continue;
            }
          }

          {
            const res = content.match(
              /the google chrome team is happy to announce the release of chrome [\d.]+ on the (stable|beta|dev) channel.*?chrome version ([\d.]+) \(platform version: ([\d.]+)\)/i,
            );

            if (res) {
              const [, channel, chrome, platform] = res;

              // add .0 to end
              const newPlatform =
                platform.split(".").length === 2 ? platform + ".0" : platform;

              const build = {
                channel: channelNameToId(channel),
                platform: newPlatform,
                chrome,
              };

              if (testBuild(build)) yield build;

              continue;
            }
          }

          {
            const res = content.match(
              /the google chrome team is happy to announce the release of chrome \d+ \w+ for chrome os (stable|beta|dev) channel.*?\(R\d+ release ([\d.]+) with Chrome ([\d.]+)\)/i,
            );

            if (res) {
              /*const [, channel, platform, chrome] = res;

              const build = {
                channel: channelNameToId(channel),
                platform,
                chrome,
              };

              if (testBuild(build)) yield build;*/

              continue;
            }
          }

          {
            const res = content.match(
              /the google chrome team is happy to announce the release of chrome ([\d.]+) \(platform version: ([\d.]+)\) on the (stable|beta|dev) channel/i,
            );

            if (res) {
              const [, chrome, platform, channel] = res;

              // add .0 to end
              const newPlatform =
                platform.split(".").length === 2 ? platform + ".0" : platform;

              const build = {
                channel: channelNameToId(channel),
                platform: newPlatform,
                chrome,
              };

              if (testBuild(build)) yield build;

              continue;
            }
          }

          {
            const res = content.match(
              /the google chrome team is happy to announce the release of chrome \d+ (?:\w+ )?(?:on the|for Chrome OS) (stable|beta|dev) channel for chromebooks \(.*?\)\. chrome version ([\d.]+) \(platform version ([\d.]+)\)/i,
            );

            if (res) {
              const [, channel, chrome, platform] = res;

              // add .0 to end
              const newPlatform =
                platform.split(".").length === 2 ? platform + ".0" : platform;

              const build = {
                channel: channelNameToId(channel),
                platform: newPlatform,
                chrome,
              };

              if (testBuild(build)) yield build;

              continue;
            }
          }

          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+) for chromebooks:/i,
            );

            if (res) {
              const [, channel, chrome] = res;

              const platforms: string[] = [];

              content.replace(
                /\(platform vrsion: ([\d.]+)\)/gi,
                (match, platform: string) => {
                  platforms.push(platform);
                  return "";
                },
              );

              for (const platform of platforms) {
                const build = {
                  channel: channelNameToId(channel),
                  platform,
                  chrome,
                };

                if (testBuild(build)) yield build;
              }

              continue;
            }
          }

          // legacy (newer)
          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+) for the devices listed below:(.*?)/i,
            );

            if (res) {
              const [, channel, chrome, anyPlatforms] = res;
              const platforms: string[] = [];

              anyPlatforms.replace(
                /([\d.]+) for/gi,
                (match, platform: string) => {
                  platforms.push(platform);
                  return "";
                },
              );

              for (const platform of platforms) {
                const build = {
                  channel: channelNameToId(channel),
                  platform,
                  chrome,
                };

                if (testBuild(build)) yield build;
              }

              continue;
            }
          }

          // legacy (newer)
          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+) for all (?:chrome os devices|platforms including chromebooks) \(Platform versions?: (.*?)\)/i,
            );

            if (res) {
              const [, channel, chrome, anyPlatforms] = res;
              const platforms: string[] = [];

              // do not match pepper flash version
              anyPlatforms.replace(
                /([\d.]+\.[\d.]+\.[\d.]+)(?!\.)/g,
                (match, platform: string) => {
                  platforms.push(platform);
                  return "";
                },
              );

              for (const platform of platforms) {
                const build = {
                  channel: channelNameToId(channel),
                  platform,
                  chrome,
                };

                if (testBuild(build)) yield build;
              }

              continue;
            }
          }

          // legacy
          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+). platform version: ([\d.]+)/i,
            );

            if (res) {
              const [, channel, chrome, platform] = res;

              const build = {
                channel: channelNameToId(channel),
                platform,
                chrome,
              };

              if (testBuild(build)) yield build;

              continue;
            }
          }

          // legacy
          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+). the platform version /i,
            );

            if (res) {
              const [, channel, chrome] = res;

              const platforms: string[] = [];

              // easily iterate over content
              content.replace(/is ([\d.]+)\./gi, (match, platform: string) => {
                platforms.push(platform);
                return "";
              });

              for (let platform of platforms) {
                // add .0 to end
                if (platform.split(".").length === 2) platform += ".0";

                const build = {
                  channel: channelNameToId(channel),
                  platform,
                  chrome,
                };

                if (testBuild(build)) yield build;
              }

              continue;
            }
          }

          // legacy
          {
            const res = content.match(
              /the Chrome OS (stable|beta|dev) channel has been updated to ([\d.]+) with chrome ([\d.]+)/i,
            );

            if (res) {
              /*const [, channel, platform, chrome] = res;

              // this regex may not even match
              const build = {
                channel: channelNameToId(channel),
                platform,
                chrome,
              };

              if (testBuild(build)) yield build;
              */

              continue;
            }
          }

          // legacy (early)
          {
            // exact version wasnt specified...
            const res = content.match(
              /the chrome os (stable|beta|dev) channel has been updated to (?:the latest )?R(\d+) release ([\d.]+) including (?:the new chrome|chrome (?:update ))?(?: (\d+) )?/i,
            );

            if (res) {
              /*const [, channel, chrome, platform] = res;

              // chrome is whole number

              const build = {
                channel: channelNameToId(channel),
                platform,
                chrome,
              };

              // should always fail test...
              if (testBuild(build)) yield build;*/

              continue;
            }
          }

          // legacy (early)
          {
            const res = content.match(
              /the chrome os (stable|beta|dev) channel has been updated to (?:the latest )?R\d+ release ([\d.]+) including (?:the new chrome|chrome (?:update ))?(?: \d+ )?\(?([\d.]+)\)?/i,
            );

            if (res) {
              /*const [, channel, platform, chrome] = res;

              const build = {
                channel: channelNameToId(channel),
                platform,
                chrome,
              };

              if (testBuild(build)) yield build;*/

              continue;
            }
          }

          {
            const res = content.match(
              /(the (?:(?:stable|beta|dev)(?: and )?)+) channels? (?:(?:(?:has|have) been|is being) (?:updated|released) to (?:chrome versions?:? )?)?([\d\s.,/]+) ?\(platform versions?:? ([\d\s.,/]+)\)?/i,
            );

            if (!res) {
              console.error(post.url, "Couldn't match", { content, title });
              continue;
            }

            const [, anyChannels, anyChromes, anyPlatforms] = res;
            const channels = anyChannels
              // /^the /
              .slice(4)
              .split(/ and /)
              .map(channelNameToId);
            const platforms = anyPlatforms
              .split(/\s*[/,]\s*/g)
              .map((v) => v.trim());
            const chromes = anyChromes
              .split(/\s*[/,]\s*/g)
              .map((v) => v.trim());

            for (let i = 0; i < platforms.length; i++) {
              let platform = platforms[i];
              // minor patch version /
              if (platform.split(".").length === 1)
                platform = platforms[0].slice(0, -1) + platform;
              // [platformA,platformB] [chromeA,chromeB]
              let chrome = i > chromes.length - 1 ? chromes[0] : chromes[i];
              // add .0 to end
              if (chrome.split(".").length === 3) chrome += ".0";

              // add .0 to end
              if (platform.split(".").length === 2) platform += ".0";

              if (platform.split(".").length === 3)
                for (const channel of channels) {
                  const build = {
                    channel,
                    chrome,
                    platform,
                  };

                  if (testBuild(build)) yield build;
                }
            }
          }
          // const match = ();
        } else console.log("Could not match meta:", title, post.url);
      }

    if (data.nextPageToken) nextPageToken = data.nextPageToken;
    else break;
  }
}

// from https://chromereleases.googleblog.com/
// {"blogId": "..."}

const builds: cros_build[] = [];

for await (const build of getBlogspot("8982037438137564684")) {
  builds.push(build);
}

console.log("Found", builds.length, "builds");

insertManyBuilds(builds);
