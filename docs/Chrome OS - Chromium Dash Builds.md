# Crawling Chromium Dash for Chrome OS builds

This will scrape [Chromium Dash](https://chromiumdash.appspot.com/serving-builds?deviceCategory=Chrome%20OS) for Chrome OS builds. Because Google does not want to provide data for earlier builds of Chrome OS, only the last ~8 builds for each device are shown. Data scraped will include the Chrome version and the platform version.

You can get an idea of the data we are after from [Version Numbers](https://www.chromium.org/developers/version-numbers/). We are scraping Chromium Dash for official production builds of Chrome OS, not official development builds.

# Crawling Chromium Dash for Chrome OS build targets

This will scrape [Chromium Dash](https://chromiumdash.appspot.com/serving-builds?deviceCategory=Chrome%20OS) for Chrome OS boards. Data scraped will include the board's codename, the board's highest mass production (MP) key, the board's brand names, and if the board is an AUP device.

The above data is required for our algorithms to bruteforce the recovery image's filename on Google's servers. The mass production often changes from older to newer builds. The AUP status is simply for analysis.

## Quickstart

Skip to step 4 if you've already initialized everything.

1. Clone the repository

```sh
git clone https://github.com/e9x/chrome-versions.git
cd chrome-versions
```

2. Install dependencies

```sh
npm install
```

3. Initialize the database

This will erase the previous database, if it exists.

```sh
npm run init
```

4. Run the crawler

```sh
npm run crawlDash
```

You now have the last ~5 builds for every Chromebook board. This data can be found in the `cros_target`, `cros_build`, and `cros_brand` tables in `dist/chrome.db`.
