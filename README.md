# 🧵 WordString - Sewing Edition

WordString is a responsive, offline-first Progressive Web App (PWA) word puzzle game designed with a warm **Sewing, Yarn, and String** aesthetic. 

## 🎮 Game Concept & Rules

* **Board Layout**: You start with a **vertical starter word** on a stretched linen canvas inside a bamboo **Embroidery Hoop**.
* **Spool Hand**: You are given a fixed pool of **6 colorful thread spools** (letter blocks) representing the letter choices.
* **Stitching Words**: Spell a new word horizontally, starting from the **last letter** of the vertical starter word.
* **Spool Usage**: You must use **2 or more** spools to submit a word.
* **Turn Flow**: Spools remain grayed out as you click them. Spools are only replaced when you submit a valid word, making it much easier to unscramble longer words!
* **Shift Transition**: On submitting a correct word, the horizontal spelled tiles diagonally rotate and translate to become the new vertical starter column.
* **Timer & Score**:
  * You start with **1 minute**.
  * Each valid word submitted adds a **+30 seconds** time bonus.
  * Score increases based on word length:
    * 3 letters = 1 point
    * 4 letters = 3 points
    * 5 letters = 5 points
    * 6 letters = 9 points
    * 7 letters = 15 points

---

## 🧶 Thematic Features & Characters

### 1. "Stringly" the Mascot
* A cute ball of yarn with button eyes, cross-stitch thread pupils, and wiggling string legs.
* Reacts dynamically to your moves: wiggles and breathes when idle, spins and jumps when you score, gets dizzy with spiral eyes on invalid words, and shivers when the thread (time) is running short.

### 2. Crafty Visual Design
* **Embroidery Hoop Board**: Styled with wooden textures, metallic adjustment screws, and canvas backing.
* **Felt Patch Tiles**: Letter tiles look like colorful felt patches with dashed sewing stitches.
* **Thread Spools**: Letter blocks are styled as wooden thread spools wrapped in colorful wool yarn.

### 3. Crossover Guest Celebrations
* **6-Letter Words**: Roxy (blue cylinder), Toxy (pink diamond), and Foxy (yellow box) slide up from the bottom of the screen to perform a bouncing cheer dance.
* **7-Letter Words**: Boxy itself parachutes down from the sky with a red-and-white canopy, deflates the parachute on landing, waves its arms, and dances as confetti falls.

### 4. Synthesized Audio
* Employs native Web Audio API oscillators to generate clicky needle-tap pops, chiming string-pluck victory arpeggios, and buzzer sewing-machine jams without using heavy audio asset files.

### 5. PWA Standalone & Offline Mode
* Includes a web app manifest and service worker that caches all styling, code, and dictionary databases. Play 100% offline with an installation banner prompt for desktop and mobile home screens.

---

## 🛠️ File Structure

* `index.html`: Holds the game structure, mascot panels, canvas overlays, and modals.
* `style.css`: All themes, layouts, animations, responsive clamps, and mascot drawings in pure CSS.
* `game.js`: Sound synthesizers, round-seeding algorithms, timer loops, and event listeners.
* `words.js`: Dual-layer database of 51k+ validation dictionary words and 7.6k common seeding words.
* `manifest.json` & `sw.js`: PWA configuration for installation and offline availability.
* `test_words.js`: Playability simulations, point checks, and dictionary coverage tests.

---

## 🚀 How to Run Locally

Since it is built with pure HTML, CSS, and JS, you can run it directly:
1. Double-click `index.html` or open it in any modern browser.
2. For service worker caching and PWA installation to load, serve it via a local server (e.g. `npx serve`, Python's `http.server`, or Live Server extension).
