from datetime import datetime
import requests

# This example does not open the chrome.db file for simplicity.
# However, it shares structures used when working with the database.
# import sqlite3
# con = sqlite3.connect("../chrome-versions/dist/chrome.db")

# sample tables from chrome.db
boards = [{"board": "reks", "mp_key": 4, "mp_token": "mp"}]
builds = [
    {
        "platform": "8530.93.0",
        "chrome": "53.0.2785.144",
        "channel": "stable-channel",
    },
    {
        "platform": "8743.85.0",
        "chrome": "54.0.2840.101",
        "channel": "stable-channel",
    },
    {
        "platform": "14695.85.0",
        "chrome": "102.0.5005.75",
        "channel": "stable-channel",
    },
]

# arbitrary board for this example
board = boards[0]


def getRecoveryURL(image, secure=False):
    return "http{ssl}://dl.google.com/dl/edgedl/chromeos/recovery/chromeos_{platform}_{board}_recovery_{channel}_{mp_token}{mp_key}.bin.zip".format(
        ssl="s" if secure else "",
        platform=image["platform"],
        board=image["board"],
        channel=image["channel"],
        # firmware mass production key
        # can be found in chrome://version, see Revision: and the branch
        # reks v2: Revision: ___-refs/branch-heads/2785@{#931}
        # reks v4: Revision: ___-refs/branch-heads/4389@{#1546}
        mp_key="" if image["mp_key"] == 1 else "-v" + str(image["mp_key"]),
        # earlier boards have unique mass production keys
        # these are baked into the firmware and cannot be changed?
        mp_token=image["mp_token"],
    )


for i in range(len(builds)):
    build = builds[i]

    for i in range(board["mp_key"]):
        # start from 1, mp_key 0 doesn't exist
        mp_key = i + 1
        # cros_recovery_image, intermediate type for cros_recovery_image_db because we haven't got the last_modified column yet
        recovery_image = {
            # irrelevant when making a request, but required for storing in database:
            "chrome": build["chrome"],
            "platform": build["platform"],
            "channel": build["channel"],
            "board": board["board"],
            "mp_key": mp_key,
            "mp_token": board["mp_token"],
        }

        res = requests.head(getRecoveryURL(recovery_image))

        if res.ok:
            print("Found recovery image:", getRecoveryURL(recovery_image))

            # TODO: write final struct to database
            recovery_image_db = dict.copy(recovery_image)

            recovery_image_db["last_modified"] = (
                datetime.strptime(
                    res.headers["last-modified"], "%a, %d %b %Y %H:%M:%S %Z"
                ).isoformat(sep="T", timespec="milliseconds")
                + "Z"
            )

            print(recovery_image_db)
