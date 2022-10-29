# chrome-versions

<a href="https://www.npmjs.com/package/chrome-versions"><img src="https://img.shields.io/npm/v/chrome-versions.svg?maxAge=3600" alt="npm version" /></a>

Database of Chrome builds and Chrome OS recovery images hosted by Google.

> Currently, only Chrome OS is being worked on.

## API

The API uses ESM for consistency and efficiency.

We provide two APIs:

- [import("chrome-versions")](./lib/index.js)
  - Runs in any environment (browser, Node)
  - Utilities for manipulating and validating data structures
  - Type definitions for data structures
- [import("chrome-versions/db")](./lib/db.js)
  - Only runs in Node
  - Exposes the standard path location to the compiled database (ie. an absolute path to `dist/chrome.db`)
  - Very reliable compared to manually locating `dist/chrome.db` in the package

## Database

Complete databases can be found in the [NPM package](https://www.npmjs.com/package/chrome-versions). These databases are produced on high-end workstations (16 GB memory, low latency connection to [dl.google.com](https://dl.google.com/)), however you should be able to produce them on your own machine.

See the [wiki](https://github.com/e9x/chrome-versions/wiki) for information (quickstart, how this works).
