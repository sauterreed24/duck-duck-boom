# Duck Duck BOOM!

A daily cannon-launch duck game for team calls. Everyone who booked a meeting today gets a randomly generated duck, a giant flaming cannon named Ol' Thunderbill fires them one at a time, and the duck that lands farthest takes home the Golden Loaf.

> **Status:** in development. This README describes the planned game and will be updated when the first version ships.

## How a round works

1. **Check off who booked today.** The roster is saved, so it's a few clicks each day.
2. **Reveal the ducks.** Everyone gets a new duck every day, with its own look, a ridiculous name and a rarity, from Common up to Legendary.
3. **Launch.** One duck at a time: the cannon tilts, the power gauge spins, and "FIRE IN THE DUCK!" Trampolines, geese, UFOs, bread and plenty of other surprises decide how far each duck flies.
4. **Results.** A podium, awards for everyone's funniest moments, a highlights list, and a short summary you can paste into the team chat.

A round with 10 players takes about 3 minutes, or about 2 in turbo mode.

## Play it

- **Online:** https://sauterreed24.github.io/duck-duck-boom/ (live once GitHub Pages is turned on)
- **Offline:** download `index.html` and open it in Chrome or Edge. No install and no internet needed.

### Hosting it on a Teams call

1. Turn on Do Not Disturb so notification sounds don't play through the share.
2. In Teams, click **Share** and turn on **Include sound**.
3. Share the browser window and press **F** for fullscreen.

## Controls

| Key | Action |
| --- | --- |
| Space | Next step / launch |
| R | Instant replay of the last flight |
| T | Turbo (2x speed) |
| S | Skip to this flight's result |
| M | Mute |
| F | Fullscreen |
| Esc | Pause and settings |

## Fair play

- It's pure luck. A duck's look, name, rarity, team and launch order never change how far it flies.
- Each race gets a fresh random seed, shown as the race ID on the results screen. The same seed and roster replay the exact same race.
- The daily wind, weather and course are the same for every duck that day.
- Bonus Ammo, which gives extra shots for extra meetings booked, is optional and off by default.

## Your data

The roster, settings and Waddle of Fame history are stored only in the browser that runs the game, and nothing is sent anywhere. Use **Export** in Settings to back up the history, and **Import** to move it to another browser or computer.

## How it's built

One self-contained `index.html`. All graphics are drawn with Canvas 2D and all sounds are generated with the Web Audio API, so there are no images, audio files, libraries, build steps or network requests.

## Publish with GitHub Pages

In this repo: **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and `/ (root)`, then **Save**. The game appears at the link above within a few minutes.

## License

[MIT](LICENSE)
