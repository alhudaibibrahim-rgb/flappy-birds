# Flappy Wings 🐤

A Flappy Bird-style browser game built with **HTML5 Canvas** and **vanilla JavaScript**.
No frameworks, no build step, no image or audio files — all graphics are drawn in code
and all sounds are synthesized with the Web Audio API.

## Play

1. Unzip the folder.
2. Double-click `index.html` to open it in any modern browser (Chrome, Edge, Firefox, Safari).

That's it — it works offline straight from the file system.

> Optional: serve it locally with `python -m http.server 8000` and visit
> <http://localhost:8000> (needed only if you want the web-app manifest to work).

## Controls

| Action        | Keyboard                 | Mouse / Touch |
|---------------|--------------------------|---------------|
| Flap / Start  | `Space`, `↑`, or `W`     | Click / Tap   |
| Pause/Resume  | `P` or `Esc`             | Tap (resume)  |
| Mute sound    | `M`                      | 🔊 button     |
| Restart       | `Space` / `Enter`        | Click / Tap   |

## Features

- Smooth physics with a fixed 60 Hz timestep (same speed on 60 Hz and 144 Hz screens)
- Bird tilts up on flap and dives when falling, with animated wings
- Randomized pipes, progressive difficulty (speed increases, gaps shrink)
- Parallax clouds and hills, scrolling ground
- Score, persistent **best score** (saved in `localStorage`)
- Medals: Bronze (10), Silver (20), Gold (30), Platinum (40)
- Screen shake, hit flash, flap particles
- Synthesized sound effects with mute toggle (remembered between visits)
- Auto-pause when the tab is hidden
- Responsive layout, high-DPI (Retina) crisp rendering, mobile touch support

## Project structure

```
flappy-wings/
├── index.html          # Page markup and entry point
├── css/
│   └── style.css       # Layout and styling
├── js/
│   ├── audio.js        # Web Audio sound effects (Sfx)
│   └── game.js         # Game loop, physics, rendering, input
├── assets/
│   └── favicon.svg     # Site icon
├── manifest.json       # Web-app manifest (installable on mobile)
├── LICENSE             # MIT
├── .gitignore
└── README.md
```

## Customizing

Open `js/game.js` and tweak the `CFG` object near the top:

```js
const CFG = {
  gravity: 0.42,        // higher = falls faster
  flapVelocity: -7.4,   // more negative = stronger flap
  pipeGapStart: 160,    // starting gap between pipes
  pipeGapMin: 120,      // smallest gap at high scores
  pipeSpacing: 210,     // horizontal distance between pipes
  speedStart: 2.4,      // starting scroll speed
  speedMax: 3.6         // max scroll speed
};
```

To reset your best score, run `localStorage.removeItem("fw_best")` in the browser console.

## Deploying

Because it's 100% static, you can host it anywhere: GitHub Pages, Netlify, Vercel,
Cloudflare Pages, or any web server — just upload the folder contents.

**GitHub Pages:** push the files to a repo → *Settings → Pages* → deploy from the `main` branch root.

## Credits & License

Inspired by the classic *Flappy Bird* by Dong Nguyen. This is an independent fan-made
tribute; all code and artwork are original. Released under the [MIT License](LICENSE).
