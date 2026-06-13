# Backup & Restore — plain-language guide

This project lives in three places, so it is hard to lose:

1. **The working folder** — `~/update-available` (what you edit and run).
2. **GitHub** — `github.com/sergioroxo/update-available` (the online copy;
   every `git push` updates it).
3. **Local backups** — timestamped `.tar.gz` files in
   `~/Backups/update-available/` (made by the script below).

A `.tar.gz` ("tarball") is just a single compressed file holding the whole
project. The backups deliberately **leave out** the `node_modules` folder
(160+ MB of downloaded code) because it rebuilds itself with one command —
so each backup is tiny (under 1 MB) instead of huge.

---

## To make a backup (compress)

Open the **Terminal** app and paste this one line, then press Return:

```bash
bash ~/update-available/tools/backup.sh
```

That's it. You'll see something like:

```
✓ Backup OK — 716K, 408 files.
```

A new file appears in `~/Backups/update-available/` named with today's date
and time, e.g. `update-available_2026-06-13_1136.tar.gz`. Run it whenever you
want a snapshot — before a big change is a good habit.

> **Tip:** to save a backup somewhere else (e.g. a USB drive), set a
> destination first:
> ```bash
> BACKUP_DIR=/Volumes/MyUSB/backups bash ~/update-available/tools/backup.sh
> ```

---

## To open a backup (decompress / restore)

### Quick look (just extract the files somewhere safe)

This unpacks a backup into a **new folder** without touching your working
copy. Replace the filename with the backup you want:

```bash
mkdir -p ~/Desktop/restored
tar -xzf ~/Backups/update-available/update-available_2026-06-13_1136.tar.gz -C ~/Desktop/restored
```

You'll get `~/Desktop/restored/update-available/` with everything in it.

> On macOS you can also just **double-click** the `.tar.gz` in Finder — it
> unpacks next to itself. The Terminal way above lets you choose where it goes.

### Make it runnable again (reinstall the skipped parts)

The backup has all your code but not `node_modules`. To get the project
running from a restored copy:

```bash
cd ~/Desktop/restored/update-available
npm install      # re-downloads node_modules (a few minutes, needs internet)
npm run dev      # starts it; open the printed http://localhost address
```

### Fully replace your working copy with a backup (use with care)

Only do this if your working folder is broken and you want to roll back.
It renames the current folder out of the way first (it does **not** delete
it), then restores the backup in its place:

```bash
mv ~/update-available ~/update-available_broken_$(date +%s)   # set the old one aside
tar -xzf ~/Backups/update-available/update-available_2026-06-13_1136.tar.gz -C ~
cd ~/update-available && npm install
```

If all goes well you can later delete the `~/update-available_broken_…`
folder. If something looks wrong, your old folder is still right there.

---

## How to pick which backup

List them newest-first:

```bash
ls -lt ~/Backups/update-available/
```

The name is the date and 24-hour time it was made
(`update-available_YYYY-MM-DD_HHMM.tar.gz`). Newest is usually the one you
want.

---

## What's inside a backup (and what isn't)

| Included | Left out (rebuilds itself) |
|---|---|
| All source code (`src/`) | `node_modules/` → `npm install` |
| All content (`data/`, narrative + room layout) | `dist/` → `npm run build` |
| All docs (`docs/`) | `.DS_Store` (macOS clutter) |
| Full git history (`.git/`) | |

Because the git history is included, a restored backup remembers every
commit — you don't lose the project's timeline.
