import { chromeDBPath } from "../lib/db.js";
import type { cros_build, cros_channel } from "../lib/index";
import { isValidBuild } from "../lib/index.js";
import type { BloggerPostList } from "./Blogger";
import Database from "better-sqlite3";
import fetch from "node-fetch";
import { stripHtml } from "string-strip-html";

const db = new Database(chromeDBPath);

// try it: https://developers.google.com/blogger/docs/3.0/reference/posts/list?apix_params=%7B%22blogId%22%3A%228982037438137564684%22%7D

const [, , googleAPIKey] = process.argv;

if (!googleAPIKey) throw new Error("You must specify an API key for blogger.");

const channelNameToId = (name: string) =>
  `${name.toLowerCase()}-channel` as cros_channel;

const testBuild = (build: cros_build): cros_build => {
  if (!isValidBuild(build))
    throw new Error(`Invalid build: ${JSON.stringify(build)}`);

  return build;
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
              / ([\d.]+) \(platform version: ([\d.]+)\)/i
            );

            if (res) {
              const [, chrome, platform] = res;

              yield testBuild({
                channel: "stable-channel",
                platform,
                chrome,
              });

              continue;
            }
          }

          console.log("Could not match LTS", { title, content });
        } else if (
          /(stable|beta|dev) (channels? (updates?|promotion)|update|(channel )?release)/i.test(
            title
          )
        ) {
          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+) for windows, mac, (?:and linux|linux,)/i
            );

            // we are missing platform!

            if (res) {
              /*const [, channel, chrome] = res;

              yield testBuild({
                channel: channelNameToId(channel),
                platform,
                chrome,
              });*/

              continue;
            }
          }

          {
            const res = content.match(
              /the google chrome team is happy to announce the release of chrome [\d.]+ on the (stable|beta|dev) channel.*?chrome version ([\d.]+) \(platform version: ([\d.]+)\)/i
            );

            if (res) {
              const [, channel, chrome, platform] = res;

              yield testBuild({
                channel: channelNameToId(channel),
                platform,
                chrome,
              });

              continue;
            }
          }

          {
            const res = content.match(
              /the google chrome team is happy to announce the release of chrome \d+ \w+ for chrome os (stable|beta|dev) channel.*?\(R\d+ release ([\d.]+) with Chrome ([\d.]+)\)/i
            );

            if (res) {
              const [, channel, platform, chrome] = res;

              yield testBuild({
                channel: channelNameToId(channel),
                platform,
                chrome,
              });

              continue;
            }
          }

          {
            const res = content.match(
              /the google chrome team is happy to announce the release of chrome ([\d.]+) \(platform version: ([\d.]+)\) on the (stable|beta|dev) channel/i
            );

            if (res) {
              const [, chrome, platform, channel] = res;

              yield testBuild({
                channel: channelNameToId(channel),
                platform,
                chrome,
              });

              continue;
            }
          }

          {
            const res = content.match(
              /the google chrome team is happy to announce the release of chrome \d+ (?:\w+ )?(?:on the|for Chrome OS) (stable|beta|dev) channel for chromebooks \(.*?\)\. chrome version ([\d.]+) \(platform version ([\d.]+)\)/i
            );

            if (res) {
              const [, channel, chrome, platform] = res;

              yield testBuild({
                channel: channelNameToId(channel),
                platform,
                chrome,
              });

              continue;
            }
          }

          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+) for chromebooks:/i
            );

            if (res) {
              const [, channel, chrome] = res;

              const platforms: string[] = [];

              content.replace(
                /\(platform vrsion: ([\d.]+)\)/gi,
                (match, platform: string) => {
                  platforms.push(platform);
                  return "";
                }
              );

              for (const platform of platforms)
                yield testBuild({
                  channel: channelNameToId(channel),
                  platform,
                  chrome,
                });

              continue;
            }
          }

          // legacy (newer)
          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+) for the devices listed below:/i
            );

            if (res) {
              const [, channel, chrome] = res;
              const platforms: string[] = [];

              content.replace(/([\d.]+) for/gi, (match, platform: string) => {
                platforms.push(platform);
                return "";
              });

              for (const platform of platforms)
                yield testBuild({
                  channel: channelNameToId(channel),
                  platform,
                  chrome,
                });

              continue;
            }
          }

          // legacy (newer)
          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+) for all (?:chrome os devices|platforms including chromebooks) \(Platform versions?: (.*?)\)/i
            );

            if (res) {
              const [, channel, chrome, anyPlatform] = res;
              const platforms: string[] = [];

              anyPlatform.replace(/([\d.]+)/g, (match, platform: string) => {
                platforms.push(platform);
                return "";
              });

              for (const platform of platforms)
                yield testBuild({
                  channel: channelNameToId(channel),
                  platform,
                  chrome,
                });

              continue;
            }
          }

          // legacy
          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+). platform version: ([\d.]+)/i
            );

            if (res) {
              const [, channel, chrome, platform] = res;

              yield testBuild({
                channel: channelNameToId(channel),
                platform,
                chrome,
              });

              continue;
            }
          }

          // legacy
          {
            const res = content.match(
              /the (stable|beta|dev) channel has been updated to ([\d.]+). the platform version /i
            );

            if (res) {
              const [, channel, chrome] = res;

              const platforms: string[] = [];

              // easily iterate over content
              content.replace(/is ([\d.]+)\./gi, (match, platform: string) => {
                platforms.push(platform);
                return "";
              });

              for (const platform of platforms)
                yield testBuild({
                  channel: channelNameToId(channel),
                  platform,
                  chrome,
                });

              continue;
            }
          }

          // legacy
          {
            const res = content.match(
              /the Chrome OS (stable|beta|dev) channel has been updated to ([\d.]+) with chrome ([\d.]+)/i
            );

            if (res) {
              const [, channel, platform, chrome] = res;

              yield testBuild({
                channel: channelNameToId(channel),
                platform,
                chrome,
              });

              continue;
            }
          }

          // legacy (early)
          {
            // exact version wasnt specified...
            const res = content.match(
              /the chrome os (stable|beta|dev) channel has been updated to (?:the latest )?R(\d+) release ([\d.]+) including (?:the new chrome|chrome (?:update ))?(?: (\d+) )?/i
            );

            if (res) {
              const [, channel, chrome, platform] = res;

              // chrome is whole number

              yield testBuild({
                channel: channelNameToId(channel),
                platform,
                chrome,
              });

              continue;
            }
          }

          // legacy (early)
          {
            const res = content.match(
              /the chrome os (stable|beta|dev) channel has been updated to (?:the latest )?R\d+ release ([\d.]+) including (?:the new chrome|chrome (?:update ))?(?: \d+ )?\(?([\d.]+)\)?/i
            );

            if (res) {
              const [, channel, platform, chrome] = res;

              yield testBuild({
                channel: channelNameToId(channel),
                platform,
                chrome,
              });

              continue;
            }
          }

          {
            const res = content.match(
              /(the (?:(?:stable|beta|dev)(?: and )?)+) channels? (?:(?:(?:has|have) been|is being) (?:updated|released) to (?:chrome versions?:? )?)?([\d\s.,/]+) ?\(platform versions?:? ([\d\s.,/]+)\)?/i
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
            const platforms = anyPlatforms.split(/\s*[/,]\s*/g);
            const chromes = anyChromes.split(/\s*[/,]\s*/g);

            for (let i = 0; i < platforms.length; i++) {
              let platform = platforms[i];
              // minor patch version /
              if (platform.length === 1)
                platform = platforms[i - 1].slice(0, -1) + platform;
              // [platformA,platformB] [chromeA,chromeB]
              const chrome = i > chromes.length - 1 ? chromes[0] : chromes[i];

              for (const channel of channels)
                yield testBuild({
                  channel,
                  chrome,
                  platform,
                });
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

const insert = db.prepare<
  [
    platform: cros_build["platform"],
    chrome: cros_build["chrome"],
    channel: cros_build["channel"]
  ]
>(
  "INSERT OR IGNORE INTO cros_build (platform, chrome, channel) VALUES (?, ?, ?);"
);

const builds: cros_build[] = [];

for await (const build of getBlogspot("8982037438137564684")) {
  builds.push(build);
}

const insertMany = db.transaction((builds: cros_build[]) => {
  for (const build of builds)
    insert.run(build.platform, build.chrome, build.channel);
});

insertMany(builds);
