"""S428 (UiB job 38): the contact sheets of 2016's chain and its help, the before row (5185e4f1) over the after row (S428), each
frame labelled in plain words (the computer, the headset, the phone); then tools/s424-sheets.py draws them.
   python3 tools/s428-sheets.py <S428 dir> && python3 tools/s424-sheets.py out/s428-sheets.json <S428 dir>
The stills are tools/s428-stills.mjs's, one run per build and look-mode, in <S428 dir>/{before,after}/ under the same names."""
import json, os, sys
D = sys.argv[1] if len(sys.argv) > 1 else '/Users/sergiogalvaoroxo/update-available-uib/research/article-images-2026-11-26/job38/S428'
SIDE = {'before': 'before (5185e4f1)', 'after': 'after (S428)'}
MODES = [('desktop', 'computer'), ('xr', 'headset'), ('phone', 'phone')]
def c(side, name, mode, label):
    p = f'{D}/{side}/{name}_{mode}.png'
    return {'label': f'{label}: {label_mode(mode)}', 'path': p} if os.path.exists(p) else None
def label_mode(m): return dict(MODES)[m]
def row(side, name, label, modes=('desktop', 'xr', 'phone')):
    return {'label': SIDE[side], 'cells': [c(side, name, m, label) for m in modes]}
S = [
 ('clock', '01_clock', 'The clock: the real time of day (it was 18:04 on); the day still Tuesday 6 December', 'the board, the phone\'s lock screen'),
 ('lambient-job-page', '02_lambient-job-page', 'Lambient\'s taskbar button on a job page (Lesson 2), pressed: one short line', 'Lesson 2, Lambient asked'),
 ('notification-row3', '03_notification-row3-mam', 'Row 3: Mam\'s message arrives as a notification; the phone does not open', 'after Lesson 3'),
 ('notification-row6', '04_notification-row6-notes', 'Row 6: closing the memory page puts a Notes notification on the phone', 'the page closed'),
 ('start-now-take', '05_start-now-take-leave', 'The Start map: the Now with Take me there; Shut Down… and Leave… clear of Start', 'the Start menu'),
 ('notes-window', '06_notes-window', 'Row 7: her tap opens the Notes on the phone; her line types there', 'her Notes'),
 ('notification-row8', '07_notification-row8-nuala', 'Row 8: closing the Notes locks the phone; Nuala\'s message on the lock screen', 'the Notes closed'),
 ('notification-row9', '08_notification-row9-bea', 'Row 9: Nuala\'s message opened: a notification from Maiden-to-be, Bea\'s first line', 'Nuala read'),
 ('notification-row12', '09_notification-row12-review', 'Row 12: Back to today from the kit: the group\'s notification, the review asked for', 'the kit left'),
 ('review-beside-job', '10_review-beside-job', 'Row 13, the stall of 26 Nov: a finished lesson open, then the group: the review runs', 'lesson open, group opened'),
 ('shutdown-refusal', '11_shutdown-refusal', 'Shut Down…\'s refusal, drawn in the quiet scene (the review running)', 'Shut Down… pressed'),
 ('end-in-group', '13_end-in-group', 'Row 14: "Review could not keep up." waits in the group for her', 'two minutes later'),
 ('update', '14_update', 'Row 15: closing the group brings the update notice', 'the group closed'),
]
spec = {}
for key, name, title, label in S:
    spec[f'SHEET_{key}'] = {'title': title, 'rows': [row('before', name, label), row('after', name, label)]}
spec['SHEET_leave-xr'] = {'title': 'Leave… in the headset opens its menu', 'rows': [row('before', '12_leave-xr-menu', 'Leave… pressed', ('xr',)), row('after', '12_leave-xr-menu', 'Leave… pressed', ('xr',))]}
os.makedirs('out', exist_ok=True)
json.dump(spec, open('out/s428-sheets.json', 'w'), indent=1)
print('ok', len(spec), 'sheets')
