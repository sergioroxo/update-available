"""S426 (UiB job 35 Part D, Act III): the contact sheets spec (before row over after row, plain labels), then
python3 tools/s424-sheets.py out/s426-sheets.json <S426 dir>.
   python3 tools/s426-sheets.py && python3 tools/s424-sheets.py out/s426-sheets.json research/article-images-2026-11-23/job35/S426
The computer's and the headset mock's "before" are S421's photographs of today (S421/today/T22–T36); the phone's are a run of
tools/s426-act3-stills.mjs on today's build (S426/before/)."""
import json, os
R = '/Users/sergiogalvaoroxo/update-available-uib/research/article-images-2026-11-23/job35'
T, B, A = R + '/S421/today', R + '/S426/before', R + '/S426/after'
LOOK = {'desktop': 'computer', 'xr': 'headset mock', 'phone': 'phone, upright'}
def c(path, label): return {'label': label, 'path': path} if os.path.exists(path) else None
def today(name, label, looks=('desktop', 'xr', 'phone')): return [c(f'{B}/{name}_{lk}.png', f'{LOOK[lk]}: {label}') for lk in looks]
def after(name, label, looks=('desktop', 'xr', 'phone')): return [c(f'{A}/{name}_{lk}.png', f'{LOOK[lk]}: {label}') for lk in looks]
S425A = R + '/S425/after'
M = R + '/S426/after-9974fe1f-maximised'
def maxi(name, label, looks=('desktop', 'xr', 'phone')): return [c(f'{M}/{name}_{lk}.png', f'{LOOK[lk]}: {label}') for lk in looks]
spec = {
 # ⚑ S426e (his 24 Nov: "And now the messenger covers all of the screen?? What happened?"; "Fix it first as well") — the group back in
 #   its column for the whole of Act III, no line cut in half; before = 9974fe1f's maximised window, after = the column
 'SHEET_fix_news': {'title': 'Beat 11 · Bea\'s news: the window maximised (9974fe1f), now in its own column',
   'rows': [{'label': 'maximised (before, 9974fe1f)', 'cells': maxi('11b_news-card', 'the card') + maxi('11c_news-all-light', 'all five, a line cut under the header', ('desktop',))},
            {'label': 'in its column (after, S426e)', 'cells': after('11b_news-card', 'the card, its fact line whole') + after('11c_news-all-light', 'all five, the light lifted', ('desktop',))}]},
 'SHEET_fix_removal': {'title': 'Beat 13 · the removal: maximised, now in its column, the bar inside it',
   'rows': [{'label': 'maximised (before, 9974fe1f)', 'cells': maxi('15a_review-bar', 'the bar, the top line cut', ('desktop',)) + maxi('15b_outline-card', 'the card outlined', ('xr', 'phone')) + maxi('15e_removing', '"removing…"', ('desktop',))},
            {'label': 'in its column (after, S426e)', 'cells': after('15a_review-bar', 'the bar', ('desktop',)) + after('15b_outline-card', 'the card outlined', ('xr', 'phone')) + after('15e_removing', '"removing…"', ('desktop',))}]},
 'SHEET_fix_outnumbered': {'title': 'Beat 14 · "Review could not keep up.": maximised, now in its column',
   'rows': [{'label': 'maximised (before, 9974fe1f)', 'cells': maxi('18_could-not-keep-up', '"Review could not keep up.", a card cut under the bar')},
            {'label': 'in its column (after, S426e)', 'cells': after('18_could-not-keep-up', '"Review could not keep up."')}]},
 'SHEET_fix_forward': {'title': 'Beat 14 · her forward: maximised, now in its column',
   'rows': [{'label': 'maximised (before, 9974fe1f)', 'cells': maxi('16_forwards', '"Forward the link"', ('desktop',)) + maxi('17_her-forward', 'her forward among theirs')},
            {'label': 'in its column (after, S426e)', 'cells': after('16_forwards', '"Forward the link"', ('desktop',)) + after('17_her-forward', 'her forward among theirs')}]},
 'SHEET_fix_scroll': {'title': 'Beat 11 · scrolling: up to Bea\'s first line, "New messages" as Susan writes, back down',
   'rows': [{'label': 'scrolled up (after, S426e)', 'cells': after('scroll_up', '"Earlier messages" pressed: Bea\'s first line, whole')},
            {'label': 'a message lands under her (after, S426e)', 'cells': after('scroll_new-messages', 'her place kept, the pill reads "New messages"')},
            {'label': 'back at the bottom (after, S426e)', 'cells': after('scroll_bottom', '"New messages" pressed: the newest')}]},
 'SHEET_fix_last-beat': {'title': 'The last beat and the update: in its column in both; the thread whole',
   'rows': [{'label': 'before (9974fe1f)', 'cells': maxi('19_last-beat', 'the thread held, back in its column', ('desktop',)) + maxi('20_update', 'the update')},
            {'label': 'after (S426e)', 'cells': after('19_last-beat', 'the thread held, in its column', ('desktop',)) + after('20_update', 'the update')}]},
 'SHEET_act2_notes_fix': {'title': 'Beat 10 · her Notes: S425 slid the window over the page; now it stays in its column',
   'rows': [{'label': 'S425 (before)', 'cells': today('notes_typing', 'the line typing, the window over the page')},
            {'label': 'after (S426)', 'cells': after('notes_typing', 'the line typing, in the window\'s own column')},
            {'label': 'after (S426), written', 'cells': after('notes_written', 'written: Mam\'s note and the list under it')}]},
 'SHEET_act3_news': {'title': 'Beat 11 · Bea\'s news: two bubbles and a blank page, now a thread that keeps them, the card\'s fact',
   'rows': [{'label': 'today (before)', 'cells': today('11a_news-bea', 'Bea, in the column', ('desktop',)) + today('11b_news-card', 'the card\'s page: a headline, blank')},
            {'label': 'the storyboard (after, S426e)', 'cells': after('11a_news-bea', 'Bea, in the column', ('desktop',)) + after('11b_news-card', 'the card: "Malta · Act LV of 2016 · passed 5 December"')}]},
 'SHEET_act3_light': {'title': 'Beat 11 · all the news, the light lifted; no alert, no reply offered',
   'rows': [{'label': 'today (before)', 'cells': today('11c_news-all-light', 'two bubbles at a time', ('desktop', 'xr')) + today('11d_priority-alert', 'PRIORITY ALERT', ('desktop',)) + today('11e_reply', '"finally. about time x" offered', ('xr', 'phone'))},
            {'label': 'the storyboard (after, S426e)', 'cells': after('11c_news-all-light', 'all five, the light lifted, no reply')}]},
 'SHEET_act3_urgent': {'title': 'Beat 12 · the URGENT pop-in, now after the news',
   'rows': [{'label': 'today (before)', 'cells': today('12_urgent', 'URGENT: "Campaign kit · needs approval tonight"')},
            {'label': 'the storyboard (after, S426e)', 'cells': after('12_urgent', '"Campaign kit · the Malta vote" · "GracePlatform chose your story."')}]},
 'SHEET_act3_kit': {'title': 'Beat 12 · the kit: consent and terms cut, "We chose yours."',
   'rows': [{'label': 'today (before)', 'cells': today('13_kit', 'the kit')},
            {'label': 'the storyboard (after, S426e)', 'cells': after('13_kit', 'the kit')}]},
 'SHEET_act3_take-down': {'title': 'Beat 12 · Take my story down: the copies, and one line',
   'rows': [{'label': 'today (before)', 'cells': today('14_take-down', 'take-down, "Original retained under Terms §4."')},
            {'label': 'the storyboard (after, S426e)', 'cells': after('14_take-down', '"Taken down from SisterSignal. The copies stay. Original kept."')}]},
 'SHEET_act3_removal': {'title': 'Beat 13 · the removal: alerts and a Review page, now seen in the chat',
   'rows': [{'label': 'today (before)', 'cells': today('15a_review-bar', 'the takeover alert over the Review page', ('desktop', 'xr')) + today('15b_removing-card', 'the Review page striking rows')},
            {'label': 'the storyboard (after, S426e)', 'cells': after('15a_review-bar', 'the bar: "… You do not need to do anything."', ('desktop',)) + after('15b_outline-card', 'the card outlined', ('xr', 'phone')) + after('15c_greyed', 'the card greyed', ('desktop',)) + after('15e_removing', 'Bea\'s line, "removing…"', ('desktop',)) + after('15d_folded', 'folded: "Removed by GracePlatform"', ('desktop',))}]},
 'SHEET_act3_outnumbered': {'title': 'Beat 14 · outnumbered: "Review could not keep up."',
   'rows': [{'label': 'today (before)', 'cells': today('16_forwards', 'the forwards', ('desktop',)) + today('18_could-not-keep-up', '"4 items could not be reviewed"')},
            {'label': 'the storyboard (after, S426e)', 'cells': after('15e_removing', 'a forward "removing…" as the next lands', ('xr',)) + after('18_could-not-keep-up', '"Review could not keep up." · ten members')}]},
 'SHEET_act3_forward': {'title': 'Beat 14 · her one act: a reply written for her, now "Forward the link"',
   'rows': [{'label': 'today (before)', 'cells': today('17_her-forward', '"finally. about time x"')},
            {'label': 'the storyboard (after, S426e)', 'cells': after('16_forwards', '"Forward the link" offered', ('desktop',)) + after('17_her-forward', 'her forward among theirs')}]},
 'SHEET_act3_last-beat': {'title': 'The last beat: Orla and Lambient cut; the thread holds, then the update',
   'rows': [{'label': 'today (before)', 'cells': today('19a_orla', 'Orla, the phone asleep', ('desktop',)) + today('19_last-beat', 'Lambient\'s last lines', ('desktop',)) + today('20_update', 'the update')},
            {'label': 'the storyboard (after, S426e)', 'cells': after('19_last-beat', 'the thread held, back in its column', ('desktop',)) + [None] + after('20_update', 'the update notification')}]},
}
json.dump(spec, open('/Users/sergiogalvaoroxo/update-available-uib-j35d/out/s426-sheets.json', 'w'), indent=1)
print('ok')
