# Crawling Blogspot for Chrome OS builds

This will scrape the [Chrome Releases](https://chromereleases.googleblog.com/) blog, where Google will make a post for every build (with a few exceptions), for Chrome OS builds. Data scraped will include the Chrome version and the platform version.

You can get an idea of the data we are after from [Version Numbers](https://www.chromium.org/developers/version-numbers/). We are scraping the blog for official production builds of Chrome OS, not official development builds.

## Blogspot API key

To create the perfect key:

1. Sign into Google
2. Go to https://console.cloud.google.com/projectcreate
3. Select "Create"
4. Hover on "APIs and Services" and select "Credentials"
5. "Create Credentials" -> "API key"
6. Click on "Edit API key"
7. Scroll down to "API restrictions"
8. Select "Restrict key", select "Blogger API"
9. Save.
10. Go to the API key you just created (API key 1) and copy the "API key" field

You should now have an API key compatible with Blogspot. Although the key is limited to the Blogspot API, protect this key! Anyone who gets your blogspot key could abuse your Google account to get banned from Blogspot.

## Quickstart

1. Get your API key

From here, skip to step 5 if you've already initialized everything.

2. Clone the repository

```sh
git clone https://github.com/e9x/chrome-versions.git
cd chrome-versions
```

3. Install dependencies

```sh
npm install
```

4. Initialize the database (if you haven't)

This will erase the previous database, if it exists.

```sh
npm run init
```

5. Run the crawler

```sh
npm run crawlBlog <YOUR API KEY>
```

You now have 1-2 decades of Chrome OS builds. This data can be found in the `cros_build` table in `dist/chrome.db`.
