"""S427 (UiB job 37, T95): the contact sheets of Vera's file, the before row (ee13685e) over the after row (S427), each way a
column, labelled in plain words; then tools/s424-sheets.py draws them.
   python3 tools/s427-sheets.py && python3 tools/s424-sheets.py out/s427-sheets.json <S427 dir>
The stills are tools/s427-file-probe.mjs's, copied to <S427 dir>/{before,after}/ under the same names."""
import json, os, sys
D = sys.argv[1] if len(sys.argv) > 1 else '/Users/sergiogalvaoroxo/update-available-uib/research/article-images-2026-11-26/job37/S427'
WAY = {'do': 'she does every job', 'refuse': 'she refuses four, takes her story down, leaves the video'}
def c(side, name, way, label): p = f'{D}/{side}/{name}_{way}.png'; return {'label': f'{WAY[way]}: {label}', 'path': p} if os.path.exists(p) else None
def row(side, name, label): return {'label': 'before (ee13685e)' if side == 'before' else 'after (S427)', 'cells': [c(side, name, w, label) for w in ('do', 'refuse')]}
spec = {
 'SHEET_vera-file_seat': {'title': '2016 · Vera\'s file where she sees it: My account, activity, on the monitor, from the seat',
   'rows': [row('before', '01_vera-file_seat', 'her activity page'), row('after', '01_vera-file_seat', 'her activity page')]},
 'SHEET_vera-file_screen': {'title': '2016 · the same page, the platform\'s own screen: refusals in the flag colour after',
   'rows': [row('before', '01b_vera-file_screen', 'the screen'), row('after', '01b_vera-file_screen', 'the screen')]},
 'SHEET_menu-your-file': {'title': 'The menu\'s Your file, 2016: every job under The recommendation, now each under its own card',
   'rows': [row('before', '02_menu-your-file-2016', '2016 in Your file'), row('after', '02_menu-your-file-2016', '2016 in Your file')]},
 'SHEET_receipt': {'title': 'The receipt at the Close: 2016\'s entries, flagged count and cards used',
   'rows': [row('before', '03_receipt-2016', 'the receipt, 2016'), row('after', '03_receipt-2016', 'the receipt, 2016')]},
}
json.dump(spec, open('out/s427-sheets.json', 'w'), indent=1)
print('ok')
