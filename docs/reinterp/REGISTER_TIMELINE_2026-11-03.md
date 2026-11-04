STATUS: live

# Register timeline — 2026-11-03

`·` operable · `F` felt · `R` respite · `—` ritual/transition · `?` unknown.

Map order, all optional/full-cut beats included; not a timed playthrough. Counts are beats, not duration. Indices are 1-based. Quiet is reported separately, never inferred as a register.

| Era | Timeline | O/F/R/—/? | Longest O | First F/R | O:person |
|---|---|---|---:|---|---|
| E1 · 1997 · Daniel | `? ? ? ? ? ? ? ? ? ? ? ? ? · ? · ? ? ? ?` | 2/0/0/0/18 | 1 | none annotated | n/a (no annotated person beats) |
| E2 · 2003 · Daniel | `? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?` | 0/0/0/0/17 | 0 | none annotated | n/a (no annotated person beats) |
| E3 · 2016 · Vera | `? ? ? ? ? ? ? ? ? ? ? ?` | 0/0/0/0/12 | 0 | none annotated | n/a (no annotated person beats) |
| E4 · 2026 · Maya | `? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?` | 0/0/0/0/19 | 0 | none annotated | n/a (no annotated person beats) |

Unknowns break operable runs: run lengths are lower bounds; first F/R and ratios cover only annotated beats. “None annotated” does not mean no person beats exist.

| Era | Quiet indices | ? beats (index:id) |
|---|---|---|
| E1 | none | 1:profile, 2:kit, 3:read, 4:pray, 5:pledge, 6:connect, 7:web, 8:browse, 9:channel, 10:wall, 11:request, 12:image, 13:dm, 15:rootcause, 17:handheld, 18:packet, 19:diary, 20:update |
| E2 | 14, 16 | 1:assistant, 2:checkin, 3:story, 4:release, 5:tapes, 6:cut, 7:online, 8:yourfile, 9:forum, 10:apply, 11:clear, 12:send, 13:message, 14:thread, 15:alert, 16:residue, 17:update |
| E3 | 11 | 1:migrate, 2:signin, 3:consent, 4:work, 5:record, 6:jobs, 7:recommend, 8:group, 9:phone, 10:vote, 11:cascade, 12:update |
| E4 | 14, 17, 18, 19 | 1:wake, 2:l, 3:defaults, 4:search, 5:agent, 6:matchmade, 7:open, 8:meridian, 9:back, 10:photo, 11:composite, 12:story, 13:messages, 14:junie, 15:reversal, 16:headset, 17:session, 18:stream, 19:close |

**66 unknown beats.** No prose annotations or update labels supply registers. Source: data/strings/map.json plus structured register fields in data/provotypes/*.json and data/dialog/*.json (excluding underscore-prefixed schema/test files).

Resolved identity joins: e1.form → origin_intake_e1; e1.racket → pillow, both operable (provotype JSON; joins verified in src/witness/map.ts: formDone/pillowDone). Otherwise only exact era-qualified IDs or same-era IDs join. No register is assigned by this tool.

**Registered records not joined** (not inserted into the timeline):

- data/provotypes/e3_theday.json: e3_theday / e3 / operable
- data/provotypes/e4_ball.json: e4_ball / e4 / respite
- data/provotypes/e4_offers.json: e4_offers / e4 / operable
