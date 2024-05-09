package main

import (
	"database/sql"
	"fmt"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type cros_build struct {
	platform string
	chrome   string
	channel  string
}

type cros_recovery_image struct {
	platform string
	channel  string
	board    string
	mp_key   int
	mp_token string
}

func (i *cros_recovery_image) URL(secure bool) string {
	v := ""

	if i.mp_key != 1 {
		v = "-v" + strconv.Itoa(i.mp_key)
	}

	proto := "https:"

	if !secure {
		proto = "http:"
	}

	return proto + "//dl.google.com/dl/edgedl/chromeos/recovery/chromeos_" + i.platform + "_" + i.board + "_recovery_" + i.channel + "_" + i.mp_token + v + ".bin.zip"
}

type cros_target struct {
	board      string
	mp_token   string
	mp_key_max int
}

type chrome_version struct {
	major int
	minor int
	patch int
}

type bruteforce_attempt struct {
	board    string
	platform string
	mp_key   int
}

func parseChromeVersion(version string) *chrome_version {
	c := new(chrome_version)
	split := strings.Split(version, ".")
	major, _ := strconv.Atoi(split[0])
	minor, _ := strconv.Atoi(split[1])
	patch, _ := strconv.Atoi(split[2])
	c.major = major
	c.minor = minor
	c.patch = patch
	return c
}

func getTargets(db *sql.DB) []cros_target {
	targets := []cros_target{}
	rows, err := db.Query("SELECT board,mp_token,mp_key_max FROM cros_target")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Query: %v", err)
		os.Exit(1)
	}
	for rows.Next() {
		target := cros_target{}
		err = rows.Scan(&target.board, &target.mp_token, &target.mp_key_max)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Scan: %v", err)
			os.Exit(1)
		}
		targets = append(targets, target)
	}

	return targets
}

func getBruteforceAttempts(db *sql.DB) []bruteforce_attempt {
	attempts := []bruteforce_attempt{}
	rows, err := db.Query("SELECT board,platform FROM bruteforce_attempt")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Query: %v", err)
		os.Exit(1)
	}
	for rows.Next() {
		attempt := bruteforce_attempt{}
		err = rows.Scan(&attempt.board, &attempt.platform)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Scan: %v", err)
			os.Exit(1)
		}
		attempts = append(attempts, attempt)
	}

	return attempts
}

func getGoodBuilds(db *sql.DB) []cros_build {
	builds := []cros_build{}
	rows, err := db.Query("SELECT channel,chrome,platform FROM cros_build WHERE channel = 'stable-channel' ORDER BY platform ASC")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Query: %v", err)
		os.Exit(1)
	}
	for rows.Next() {
		build := cros_build{}
		err = rows.Scan(&build.channel, &build.chrome, &build.platform)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Scan: %v", err)
			os.Exit(1)
		}
		if parseChromeVersion(build.chrome).major < 20 {
			continue
		}

		builds = append(builds, build)
	}

	return builds
}

func main() {
	db, err := sql.Open("sqlite3", "./dist/chrome.db")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Could not open DB: %v\n", err)
		os.Exit(1)
	}

	targets := getTargets(db)
	builds := getGoodBuilds(db)
	attempts := getBruteforceAttempts(db)

	ips, err := net.LookupIP("dl.google.com")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Could not get IPs: %v\n", err)
		os.Exit(1)
	}

	type cros_recovery_image_db struct {
		img          *cros_recovery_image
		lastModified time.Time
		chrome       string
	}

	type target_new_data struct {
		name     string
		attempts []bruteforce_attempt
		images   []*cros_recovery_image_db
	}

	target_ch := make(chan *target_new_data, len(targets))

	for _, target := range targets {
		target := target

		go func() {
			new_data := target_new_data{name: target.board}

			tr := &http.Transport{
				// MaxIdleConns:       40,
				MaxConnsPerHost:    15,
				IdleConnTimeout:    0, // 30 * time.Second,
				DisableCompression: true,
			}

			// time.Duration(3) * time.Second
			client := http.Client{Timeout: 0, Transport: tr}

			keys := []int{}

			// do it in reverse, highest to lowest
			for i := target.mp_key_max; i != 0; i-- {
				keys = append(keys, i)
			}

			for _, build := range builds {
				attempted_keys := []int{}

				for _, attempt := range attempts {
					if attempt.board == target.board && attempt.platform == build.platform {
						attempted_keys = append(attempted_keys, attempt.mp_key)
					}
				}

				filtered_keys := []int{}

			keyLoop:
				for _, key := range keys {
					for a := range attempted_keys {
						if attempted_keys[a] == key {
							continue keyLoop
						}
					}

					filtered_keys = append(filtered_keys, key)
				}

				ch := make(chan *cros_recovery_image_db, len(filtered_keys))

				for _, key := range filtered_keys {
					key := key

					go func() {
						img := cros_recovery_image{
							platform: build.platform,
							channel:  build.channel,
							board:    target.board,
							mp_key:   key,
							mp_token: target.mp_token,
						}

						req, err := http.NewRequest("HEAD", img.URL(false), nil)
						// req host header is already set so we can just set the IP
						req.Host = ips[0].String()

						if err != nil {
							fmt.Fprintf(os.Stderr, "req: %v\n", err)
							os.Exit(1)
						}

						for {
							res, err := client.Do(req)
							if err != nil {
								fmt.Fprintf(os.Stderr, "res: %v\n", err)
								continue
								// os.Exit(1)
							}

							if res.StatusCode != 200 {
								ch <- nil
							} else {
								r := cros_recovery_image_db{img: &img, chrome: build.chrome}
								// r.lastModified
								lastModified := res.Header.Get("last-modified")
								parsed, err := time.Parse(time.RFC1123, lastModified)
								if err != nil {
									fmt.Fprintf(os.Stderr, "parse time: %v\n", err)
									os.Exit(1)
								}
								r.lastModified = parsed
								ch <- &r
							}

							break
						}
					}()
				}

				for _, key := range filtered_keys {
					r := <-ch
					new_data.attempts = append(new_data.attempts, bruteforce_attempt{board: target.board, platform: build.platform, mp_key: key})
					if r != nil {
						new_data.images = append(new_data.images, r)
					}

				}
			}

			target_ch <- &new_data
		}()
	}

	for range targets {
		new_data := <-target_ch

		fmt.Println("TARGET", new_data.name, "COMPLETE")

		tx, err := db.Begin()
		if err != nil {
			fmt.Fprintf(os.Stderr, "tx: %v\n", err)
			os.Exit(1)
		}

		insert_attempt, err := tx.Prepare("INSERT INTO bruteforce_attempt (board,platform,mp_key) VALUES (?,?,?)")
		if err != nil {
			fmt.Fprintf(os.Stderr, "insert_attempt: %v\n", err)
			os.Exit(1)
		}

		insert_img, err := tx.Prepare("INSERT OR IGNORE INTO cros_recovery_image (board,platform,chrome,mp_token,mp_key,channel,last_modified) VALUES (?,?,?,?,?,?,?)")
		if err != nil {
			fmt.Fprintf(os.Stderr, "insert_img: %v\n", err)
			os.Exit(1)
		}

		for _, i := range new_data.images {
			fmt.Println("FOUND", i.img.URL(false), i.lastModified.String())
			_, err := insert_img.Exec(i.img.board, i.img.platform, i.chrome, i.img.mp_token, i.img.mp_key, i.img.channel, i.lastModified.Format(time.RFC3339))
			if err != nil {
				fmt.Fprintf(os.Stderr, "insert cros_recovery_image: %v\n", err)
				os.Exit(1)
			}
			// fmt.Println(r.RowsAffected())
		}

		for _, attempt := range new_data.attempts {
			_, err := insert_attempt.Exec(attempt.board, attempt.platform, attempt.mp_key)
			if err != nil {
				fmt.Fprintf(os.Stderr, "insert bruteforce_attempt: %v, vals %s %s %d\n", err, attempt.board, attempt.platform, attempt.mp_key)
				os.Exit(1)
			}
			// fmt.Println(r.RowsAffected())
		}

		err = tx.Commit()
		if err != nil {
			fmt.Fprintf(os.Stderr, "tx commit: %v\n", err)
			os.Exit(1)
		}
	}

	fmt.Println("DONE")
	db.Close()
}
