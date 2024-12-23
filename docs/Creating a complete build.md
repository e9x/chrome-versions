# Creating a complete build

Get an API key from [[Chrome OS - Chrome Releases Blog Builds]].

1. Clone the repository

```sh
git clone https://github.com/e9x/chrome-versions.git
cd chrome-versions
```

2. Install dependencies

```sh
npm install
```

3. Initialize the database (if you haven't)

This will erase the previous database, if it exists.

```sh
npm run init
```

4. Add manual builds to the database

```sh
npm run manualBuilds
```

5. Run the Blogspot crawler

```sh
npm run crawlBlog
```

6. Run the Chromium Dash crawler

```sh
npm run crawlDash
```

7. Run the Google recovery.json crawler

```sh
npm run crawlRecovery
```

8. Run the bruteforcer

This command will exhaust the following resources:

- Network: Thousands of connections are made to Google's servers. Nothing is downloaded, but rather we are just checking if the recovery image URL exists. We promise to reuse sockets **when possible**, but it isn't guranteed. This script will use 5-10 Mbps on average. Up to 1000 sockets may be open at once.
- CPU: All CPU cores are used as networking threads. Millions of possible recovery URL combinations are being calculated.

Stats involved in the making of v1.0.1:

- 105825 **predicted** requests (requests that haven't failed)
- 118626 **real** requests (requests that may have been retried due to the initial failing)

```sh
go run ./scripts/bruteforce.go
```
