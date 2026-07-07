# The spatial versions — how to check them all

*2026-07-06 (Round 24). Sérgio: "we should be able to check all versions… to
better understand the best solutions." Every 360° layout we've tried is preserved
in git; this is the map. To run any old one: `git checkout <ref>`, `npm run dev`,
open `?reinterp=1&era=2&debug=1`, then `git checkout reinterp` to come back.
(The debug panel's BUILD tag tells you which one is on screen.)*

## The topology question

The current build is **not radial** anymore — it's three intimate rooms arranged
axis-aligned (90°): Room 1 in front, Room 2 through the west doorway, Room 3
through the east doorway, the door+record spine behind you. From above that reads
as a **cross / T-shape**, not a fan. That was deliberate (the approved Round-24
plan: drop the non-90° wedges — they broke the pixel/rotation law and blew the
room out at T1). But it IS a real change from the radial idea you liked, so it's
worth comparing side by side before we commit.

## The versions

| Version | Git ref | Shape | The idea | Why we moved on |
|---|---|---|---|---|
| Radial bays | `42d7c2f` (S9) | apertures in walls | rooms seen through doorway-apertures | read as "closets", not rooms (your call) |
| Radial piers | `8039672` (S11) | walls slide out + piers | shipped morph ported; two rooms cascade in | "not comprehensible… makes no sense" |
| **Wedge hexagon** | `eba87c4` (S12) | hexagon, 3×120° facings | your circle-of-three drawing; furniture limiters | furniture blocked views; rooms unfinished |
| **Dolly + wedges** | `a005c39` (S13) | hexagon + seated dolly | fixed camera seats, zoom-out/in travel | room EXPLODED at T1; camera too far; lighting blew out |
| **Three rooms (now)** | working tree (S15) | axis-aligned cross/T | rooms that age; E1 intimacy kept; E4=Room 3 | current — the one you're reviewing |

The radial-hexagon geometry data is also archived as
`data/room/_archive/reinterp_deltas.radial-hexagon.json` for reference/diff (it
won't run against the current camera code — use the git ref to actually play it).

## If you want radial back

The radial *feel* (turn and a whole room faces you, all three sensed around you)
and the current *fixes* (E1 intimacy, no blow-out, clean models, aging) aren't
mutually exclusive — a gentler fan (rooms angled ~toward you but close and
intimate) could combine them. That's a design call for you; say the word and I'll
prototype a fan variant against the same rooms so you can A/B it.
