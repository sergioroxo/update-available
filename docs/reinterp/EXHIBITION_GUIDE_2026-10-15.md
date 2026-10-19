STATUS: live

# Exhibition guide — "YOUR UPDATE HAS FAILED" at After Virtual Reality, CDN (opens Thu 15 Oct 2026, 17:00)
*One page for whoever runs the machine. The piece runs offline: after the first load nothing goes to the internet.*

## 1 · Before the doors open (once, in the morning)
1. Open **Terminal** and go to the project:
   ```bash
   cd ~/update-available-reinterp
   ```
2. Build the exhibition copy (about a minute):
   ```bash
   npm run build
   ```
3. Serve it on this machine (leave this Terminal window open all day):
   ```bash
   npx vite preview --port 4173 --strictPort
   ```
4. Open Chrome full-screen in kiosk mode (a second Terminal window):
   ```bash
   open -na "Google Chrome" --args --kiosk --autoplay-policy=no-user-gesture-required "http://localhost:4173/?reinterp=1"
   ```
5. Check: the stars gather into YOUR UPDATE HAS FAILED; one click opens LambyOS Setup; the sound plays (headphones).
   Then leave it: it is ready for the first visitor.

## 2 · What visitors see
- The stars and the title → a press → **LambyOS Setup** floating in the stars, with Lamblippy (text only) → the content
  note (the only gate; a **Reduce motion** box is there) → full piece or Speedrun Version → **the LambyOS advert (1:33,
  plays in full)** → Start → the stars become Daniel's room → 1997.
- **Esc** (or the small corner button) opens the menu at any time: pause, controls, credits, **Leave**.
- At the end: the Restart card on Daniel's monitor (the four eras, the receipt, Start again) and the Lexicon with its sources.

## 3 · When nobody touches it
- **5 minutes** untouched → the screensavers fill the screen (stars, pipes, flock, the Lexicon words, the marquee, the
  maze…) with "Touch the screen to begin."
- A touch during the screensavers → "Start from the beginning?" — **Start from the beginning** or **Carry on**.
- **10 minutes** untouched → the piece clears the visit and returns to the stars by itself. Nothing is ever stored.

## 4 · If something goes wrong
| what | do |
|---|---|
| frozen, black, or stuck | press **⌘R** (reload): it returns to the stars |
| no sound | check the headphones and the Mac's volume; then ⌘R (the first press starts the sound) |
| need to get out of kiosk mode | **⌘Q** quits Chrome; restart with step 4 |
| the page says it cannot connect | the Terminal from step 3 was closed: run step 3 again, then ⌘R |
| the Mac went to sleep | System Settings → Lock Screen / Energy: never sleep while plugged in, for the exhibition days |

## 5 · Devices
The exhibition runs **the laptop version only** (his decision, 2026-10-14): one laptop, Chrome in kiosk mode, headphones.
Drag to look. (Phones, tablets and the headset are not part of this exhibition.)

## 6 · Contact
The project lead. Everything above is undoable: ⌘R always brings the piece back to the stars.
