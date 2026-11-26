"""S427 (UiB job 37, T95): the contact sheets of Vera's file, the before row (ee13685e) over the after row (S427), labelled in
plain words; then tools/s424-sheets.py draws them.
   python3 tools/s427-sheets.py <S427 dir> && python3 tools/s424-sheets.py out/s427-sheets.json <S427 dir>
The stills are tools/s427-file-probe.mjs's (one run per way and build), copied to <S427 dir>/{before,after}/ under the same names."""
import json, os, sys
D = sys.argv[1] if len(sys.argv) > 1 else '/Users/sergiogalvaoroxo/update-available-uib/research/article-images-2026-11-26/job37/S427'
WAY = {'do': 'she does every job', 'refuse': 'she refuses four jobs, takes her story down, leaves the video'}
SIDE = {'before': 'before (ee13685e)', 'after': 'after (S427)'}
def c(side, name, way, label):
    p = f'{D}/{side}/{name}_{way}.png'
    return {'label': label, 'path': p} if os.path.exists(p) else None
def byway(side, name, label): return {'label': SIDE[side], 'cells': [c(side, name, w, f'{WAY[w]}: {label}') for w in ('do', 'refuse')]}
def pages(side, way): return {'label': SIDE[side], 'cells': [c(side, '02_menu-your-file-2016', way, '2016 begins'),
    c(side, '02b_menu-your-file-2016', way, 'one window down'), c(side, '02c_menu-your-file-2016', way, 'the end of the file')]}
spec = {
 'SHEET_vera-file_seat': {'title': '2016 · Vera\'s file where she sees it: My account, activity, on the monitor, from the seat',
   'rows': [byway('before', '01_vera-file_seat', 'her activity page'), byway('after', '01_vera-file_seat', 'her activity page')]},
 'SHEET_vera-file_screen': {'title': '2016 · the same page on the platform\'s own screen: her refusals in the flag colour after',
   'rows': [byway('before', '01b_vera-file_screen', 'the page'), byway('after', '01b_vera-file_screen', 'the page')]},
 'SHEET_menu-your-file_do': {'title': 'The menu\'s Your file, 2016, she does every job: all under The recommendation, now each under its own card',
   'rows': [pages('before', 'do'), pages('after', 'do')]},
 'SHEET_menu-your-file_refuse': {'title': 'The menu\'s Your file, 2016, she refuses: each refusal now under the job she refused, flagged',
   'rows': [pages('before', 'refuse'), pages('after', 'refuse')]},
 'SHEET_receipt': {'title': 'The receipt at the Close: 2016\'s entries, how many flagged, and the cards used',
   'rows': [byway('before', '03_receipt-2016', 'the receipt, 2016'), byway('after', '03_receipt-2016', 'the receipt, 2016')]},
}
json.dump(spec, open('out/s427-sheets.json', 'w'), indent=1)
print('ok')
