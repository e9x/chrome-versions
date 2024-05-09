CREATE TABLE cros_recovery_image (
    board TEXT NOT NULL,
    platform TEXT NOT NULL,
    chrome TEXT NOT NULL,
    mp_token TEXT NOT NULL,
    mp_key INT NOT NULL,
    channel TEXT NOT NULL,
    last_modified DATETIME NOT NULL,
    UNIQUE (board, platform)
);

CREATE TABLE cros_target (
    board TEXT PRIMARY KEY UNIQUE,
    mp_token TEXT NOT NULL,
    mp_key_max INT NOT NULL
);

CREATE TABLE cros_brand (
    brand TEXT PRIMARY KEY UNIQUE,
    board TEXT NOT NULL
);

CREATE TABLE cros_build (
    platform TEXT PRIMARY KEY UNIQUE,
    chrome TEXT NOT NULL,
    channel TEXT NOT NULL
);

-- row is created to indicate that PLATFORM for BOARD was bruteforced and shouldn't be reattempted
-- does not mean it was successful or failed
-- success can be determined by checking if a cros_recovery_image with this build exists
CREATE TABLE bruteforce_attempt (
    board TEXT NOT NULL,
    platform TEXT NOT NULL,
    mp_key INT NOT NULL,
    UNIQUE (board, platform, mp_key)
);
