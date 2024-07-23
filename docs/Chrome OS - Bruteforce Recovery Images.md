# Bruteforce Chrome OS recovery images

These scripts will form possible recovery image structures (counting down mass production keys, going through every build), generate a URL, and send a HEAD requests to Google's servers to verify they are a valid recovery image. This will not download the recovery image and the request should finish as soon as the status code and headers are sent.

## Algorithm

See [Chrome OS - Bruteforce Algorithm](./Chrome%20OS%20-%20Bruteforce%20Algorithm.py).

## Quickstart

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

4. Go through all the appropriate scripts in this wiki to produce the required: Chrome OS targets, Chrome OS builds

5. Run the bruteforcer

```sh
npm run bruteforce <board name>
```

If you are unsure of what board to bruteforce or are producing a database, bruteforce them all.

```sh
npm run bruteforceAll
```
