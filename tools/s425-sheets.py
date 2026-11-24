"""S425 (UiB job 35 Part D, Act II): the contact sheets spec (before row over after row, plain labels), then python3 tools/s424-sheets.py out/s425-sheets.json <S425 dir>.
   python3 tools/s425-sheets.py && python3 tools/s424-sheets.py out/s425-sheets.json research/article-images-2026-11-23/job35/S425"""
import json, os
D = '/Users/sergiogalvaoroxo/update-available-uib/research/article-images-2026-11-23/job35/S425'
B, A = D + '/before', D + '/after'
LOOK = {'desktop': 'computer', 'xr': 'headset mock', 'phone': 'phone, upright'}
def cells(base, name, label, looks=('desktop', 'xr', 'phone')):
    out = []
    for lk in looks:
        p = f'{base}/{name}_{lk}.png'
        out.append({'label': f'{LOOK[lk]}: {label}', 'path': p} if os.path.exists(p) else None)
    return out
spec = {
 'SHEET_act2_memory-card': {'title': 'Beat 8 — today: Kindredraft\'s Install card with its empty DRAFT box; now: a memory from 2014 (Look back · Not now)',
   'rows': [{'label': 'today (before)', 'cells': cells(B, '01_memory-card', '"New: Kindredraft", DRAFT, Install')},
            {'label': 'the memory (after, S425)', 'cells': cells(A, '01_memory-card', '"You have a memory from 2014."') + cells(A, '01b_memory-card-again', 'after Not now: Look back alone', ('desktop',))}]},
 'SHEET_act2_published': {'title': 'Beat 9 — her 2014 story as GracePlatform published it',
   'rows': [{'label': 'today (before)', 'cells': cells(B, '02_published', 'her record, As published')},
            {'label': 'the memory (after, S425)', 'cells': cells(A, '02_published', '"Vera · 2014", "Edited with: …"')}]},
 'SHEET_act2_own-words': {'title': 'Beat 9 — her own words as she sent them, the cuts struck through (moved here from the end of Lesson 1)',
   'rows': [{'label': 'today (before)', 'cells': cells(B, '03_own-words', 'As sent beside As published') + cells(B, '03b_own-cut-at-lesson-1', 'her own cut after Lesson 1', ('desktop', 'xr'))},
            {'label': 'the memory (after, S425)', 'cells': cells(A, '03_own-words', 'her own words, struck through')}]},
 'SHEET_act2_notes': {'title': 'Beat 10 — her Notes: today two typings by themselves after Mam\'s message; now one, over the page\'s right half',
   'rows': [{'label': 'today (before)', 'cells': cells(B, '04_notes-typing', 'the Notes open by themselves') + cells(B, '05_notes-written', 'the new note written', ('phone',))},
            {'label': 'the memory (after, S425)', 'cells': cells(A, '04_notes-typing', 'the line typing, Mam\'s note under it') + cells(A, '05_notes-written', 'written: the whole list')}]},
 'SHEET_act2_nuala': {'title': 'After the Notes — Nuala\'s message (and then Act III\'s kit, as built)',
   'rows': [{'label': 'today (before)', 'cells': cells(B, '06_nuala', 'Nuala, then the URGENT kit')},
            {'label': 'the memory (after, S425)', 'cells': cells(A, '06_nuala', 'the lock screen, Nuala') + cells(A, '07_kit-over-the-page', 'the kit over the still page', ('desktop',))}]},
 'SHEET_set_computer': {'title': 'Heartwood brought beside the monitor — today (S424) at the monitor\'s left, small; now large enough to read (the look turned on a computer)',
   'rows': [{'label': 'S424 (before)', 'cells': [{'label': 'computer 1280×800', 'path': B + '/set_computer.png'}, {'label': 'computer 1920×1080', 'path': B + '/set_computer_1920x1080.png'}, {'label': 'phone, upright', 'path': B + '/set_phone.png'}, None]},
            {'label': 'after (S425)', 'cells': [{'label': 'computer 1280×800: the look turned 7.5° left', 'path': A + '/set_computer.png'}, {'label': 'computer 1920×1080: turned 3.5°', 'path': A + '/set_computer_1920x1080.png'}, {'label': 'phone, upright: on the monitor\'s frame', 'path': A + '/set_phone.png'}, {'label': 'headset mock (as S424)', 'path': A + '/set_xr.png'}]}]},
}
json.dump(spec, open('/Users/sergiogalvaoroxo/update-available-uib-j35d/out/s425-sheets.json', 'w'), indent=1)
print('ok')
