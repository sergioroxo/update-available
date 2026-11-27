"""S429 (UiB job 38 part two: C, D, F): the contact sheets — the before rows over the after row, each frame labelled in plain words
(the computer, the headset, the phone); then tools/s424-sheets.py draws them.
   python3 tools/s429-sheets.py <S429 dir> && python3 tools/s424-sheets.py out/s429-sheets.json <S429 dir>
The stills are tools/s429-probe.mjs --shots, one run per build and look-mode, in <S429 dir>/{before,before-s428,after}/ under the same
names: before = 5185e4f1 (the build he played, 26 Nov: his marks C1-C8), before-s428 = 282003e0 (S428, whose pictures showed the four
faults F1-F4), after = S429. Close-ups: the Handset Window's phone as drawn under each banner (phone_banner-*), and the page under
Lambient's balloon with the balloon's box drawn in (ws_balloon-*)."""
import json, os, sys
D = sys.argv[1] if len(sys.argv) > 1 else '/Users/sergiogalvaoroxo/update-available-uib/research/article-images-2026-11-26/job38/S429'
SIDE = {'before': 'before (5185e4f1, the build he played)', 'before-s428': 'before (S428, 282003e0)', 'after': 'after (S429)'}
MODES = [('desktop', 'computer'), ('xr', 'headset'), ('phone', 'phone')]
def cell(side, name, mode, label):
    p = f'{D}/{side}/{name}_{mode}.png'
    return {'label': f'{label}: {dict(MODES)[mode]}', 'path': p} if os.path.exists(p) else None
def row(side, name, label, modes=('desktop', 'xr', 'phone'), suffix=''):
    return {'label': SIDE[side] + suffix, 'cells': [cell(side, name, m, label) for m in modes]}
C = ['before', 'after']            # his marks: against the build he played
F = ['before-s428', 'after']       # the faults in S428's pictures: against S428
B = ['before', 'before-s428', 'after']
S = [
 ('C8_consent', '01_consent', 'C8: the consent card\'s opt-in, for a piece without voice', 'the consent card', C),
 ('F3-C5_clock-taskbar', '02_clock-taskbar', 'F3: the hour padded on the phone and the taskbar · C5: the Handset Window\'s taskbar button gone', 'the board', B),
 ('F2_lambient-board', '03_lambient-board', 'F2: Lambient asked on the board: the balloon fits its words, its edges cut no line', 'the board, Lambient asked', F),
 ('C7_lesson1', '04_lesson1', 'C7: Lesson 1 says 20 once (the film\'s label counts it)', 'Lesson 1, the cuts made', C),
 ('F2_lambient-lesson1', '05_lambient-lesson1', 'F2: Lambient asked on Lesson 1\'s page: a line about this page', 'Lesson 1, Lambient asked', F),
 ('F2_lambient-lesson2', '06_lambient-lesson2', 'F2: Lambient asked on Lesson 2\'s page: a line about this page; no line cut by its edges', 'Lesson 2, Lambient asked', F),
 ('C2_lesson2-done', '07_lesson2-done', 'C2: Lesson 2 finished: Back to Today clear of the Trending panel', 'Lesson 2 finished', C),
 ('F2_lambient-finished', '07b_lambient-finished', 'F2: Lambient asked on a finished lesson\'s page (Lesson 1 opened again)', 'a finished lesson, Lambient asked', F),
 ('C1_orla-rest', '08_orla-rest', 'C1: Orla\'s thread at rest: no blank band', 'Orla\'s thread', C),
 ('C1_orla-up', '09_orla-up', 'C1: Orla\'s thread scrolled up (the wheel; the thumbstick; on the phone ▲): line by line, no blank band', 'scrolled up', C),
 ('F2_lambient-lesson3', '10_lambient-lesson3', 'F2: Lambient asked on Lesson 3\'s page', 'Lesson 3, Lambient asked', F),
 ('C3_lesson3-sent', '11_lesson3-sent', 'C3: the moment Lambient sends Maureen\'s reply: Annette at once, and Lambient says it answered', 'Lambient\'s send', C),
 ('F1_banner-notes', '14_banner-notes', 'F1: the Notes banner over Mam\'s thread cuts no line', 'the memory page closed', F),
 ('F4_start-foot', '15_start-foot', 'F4: the Start menu\'s foot: no mark under Shut Down…', 'the Start menu', F),
 ('F1_banner-bea', '16_banner-bea', 'F1: Bea\'s banner over Nuala\'s thread cuts no line', 'Nuala\'s message read', F),
 ('C1_group-rest', '17_group-rest', 'C1: Bea\'s group at rest: no blank band', 'Bea\'s news read', C),
 ('C1_group-up', '18_group-up', 'C1: Bea\'s group scrolled up (the wheel; the thumbstick; on the phone ▲): line by line, no blank band', 'scrolled up', C),
 ('C1_group-up-press', '19_group-up-press', 'C1: Bea\'s group, ▲ pressed (touch\'s way, in every look-mode): back a page, no blank band', '▲ pressed', C),
 ('C6_take-down', '20_take-down', 'C6: the take-down page says what happened', 'Take my story down pressed', C),
]
spec = {}
for key, name, title, label, sides in S:
    spec[f'SHEET_{key}'] = {'title': title, 'rows': [row(s, name, label) for s in sides]}
spec['SHEET_C4_memory'] = {'title': 'C4: the memory page\'s Close stays on the right, as published and once turned to her own words', 'rows': [
    row('before', '12_memory-published', 'as published', suffix=' · as published'), row('before', '13_memory-turned', 'her own words', suffix=' · turned'),
    row('after', '12_memory-published', 'as published', suffix=' · as published'), row('after', '13_memory-turned', 'her own words', suffix=' · turned')]}
# close-ups (the computer's run): the phone under each banner; the page under Lambient's balloon, its box drawn in
def close(side, files, labels):
    return {'label': SIDE[side], 'cells': [({'label': l, 'path': f'{D}/{side}/{f}'} if os.path.exists(f'{D}/{side}/{f}') else None) for f, l in zip(files, labels)]}
pb = ['phone_banner-of-her-Notes_desktop.png', 'phone_banner-from-Maiden-to-be-Bea-_desktop.png', 'phone_banner-of-the-review_desktop.png']
pl = ['her Notes over Mam\'s thread', 'Bea over Nuala\'s thread', 'the review over the group']
spec['SHEET_F1_banners-closeup'] = {'title': 'F1, close: the Handset Window\'s phone under each banner (no line cut under its lower edge)', 'rows': [close(s, pb, pl) for s in F]}
wb = ['ws_balloon-the-board_desktop.png', 'ws_balloon-Lesson-1-s-page_desktop.png', 'ws_balloon-Lesson-2-s-page_desktop.png', 'ws_balloon-a-finished-lesson-s-page_desktop.png', 'ws_balloon-Lesson-3-s-page_desktop.png']
wl = ['the board', 'Lesson 1', 'Lesson 2', 'a finished lesson', 'Lesson 3']
spec['SHEET_F2_balloon-closeup'] = {'title': 'F2, close: the page under Lambient\'s balloon, the balloon\'s box in magenta (no line crosses its edges)', 'rows': [close(s, wb, wl) for s in F]}
# ⚑ S429c — the coordinator's H1 (the balloon covers only whole items) and H2 (a shortened preview ends with "…"): S429b (2325c60b,
#   S429/after/) above, S429c (S429/after-c/) below. Run with `c` as the second argument to write only these.
SIDE['after-c'] = 'after (S429c)'
SIDE['after-b'] = 'before (S429b, 2325c60b)'
def rowc(side, name, label, modes=('desktop', 'xr', 'phone')):
    folder = 'after' if side == 'after-b' else side
    return {'label': SIDE[side], 'cells': [({'label': f'{label}: {dict(MODES)[m]}', 'path': f'{D}/{folder}/{name}_{m}.png'} if os.path.exists(f'{D}/{folder}/{name}_{m}.png') else None) for m in modes]}
C3 = [
 ('lesson1', '04_lesson1', 'Lesson 1 (unchanged by S429c, for reference)', 'Lesson 1'),
 ('lambient-lesson1', '05_lambient-lesson1', 'H1: Lambient asked on Lesson 1: whole items only (no part of the film)', 'Lesson 1, Lambient asked'),
 ('lambient-lesson2', '06_lambient-lesson2', 'H1: Lambient asked on Lesson 2: in the right column, over whole rows, its side on the content edge', 'Lesson 2, Lambient asked'),
 ('lesson2-done', '07_lesson2-done', 'Lesson 2 finished (unchanged by S429c, for reference)', 'Lesson 2 finished'),
 ('lambient-finished', '07b_lambient-finished', 'H1: Lambient asked on a finished lesson: whole items only', 'a finished lesson, Lambient asked'),
 ('lambient-lesson3', '10_lambient-lesson3', 'H1: Lambient asked on Lesson 3: in the empty lower left, whole items only', 'Lesson 3, Lambient asked'),
 ('banner-bea', '16_banner-bea', 'H2: Bea\'s banner over Nuala\'s thread ends with "…"', 'Nuala\'s message read'),
]
specc = {}
for key, name, title, label in C3:
    specc[f'SHEET_S429c_{key}'] = {'title': title, 'rows': [rowc('after-b', name, label), rowc('after-c', name, label)]}
specc['SHEET_S429c_banners-closeup'] = {'title': 'H2, close: the phone under each banner (a shortened preview ends with "…"; her whole note gets none)', 'rows': [
    {'label': SIDE['after-b'], 'cells': [({'label': l, 'path': f'{D}/after/{f}'} if os.path.exists(f'{D}/after/{f}') else None) for f, l in zip(pb, pl)]},
    {'label': SIDE['after-c'], 'cells': [({'label': l, 'path': f'{D}/after-c/{f}'} if os.path.exists(f'{D}/after-c/{f}') else None) for f, l in zip(pb, pl)]}]}
if len(sys.argv) > 2 and sys.argv[2] == 'c':
    spec = specc
os.makedirs('out', exist_ok=True)
json.dump(spec, open('out/s429-sheets.json', 'w'), indent=1)
print('ok', len(spec), 'sheets')
