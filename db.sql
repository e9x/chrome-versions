CREATE TABLE cros_recovery_image (
  board TEXT NOT NULL,
  platform TEXT NOT NULL,
  chrome TEXT NOT NULL,
  mp_token TEXT NOT NULL,
  mp_key INT NOT NULL,
  channel TEXT NOT NULL,
  last_modified TEXT NOT NULL,
  UNIQUE(board, platform)
);

CREATE TABLE cros_target (
  board TEXT NOT NULL,
  mp_token TEXT NOT NULL,
  mp_key_max INT NOT NULL,
  UNIQUE(board)
);

CREATE TABLE cros_brand (
  board TEXT NOT NULL,
  brand TEXT NOT NULL,
  UNIQUE(brand)
);

CREATE TABLE cros_build (
  platform TEXT NOT NULL,
  chrome TEXT NOT NULL,
  channel TEXT NOT NULL,
  UNIQUE(platform)
);