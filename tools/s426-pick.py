"""S426 (UiB job 35 Part D, Act III): pick the Act III stills from a run of tools/s426-act3-stills.mjs by what they show (its sig),
copy them to S426/<before|after>/<nn>_<what>_<look>.png.
   python3 tools/s426-pick.py out/s426/after-desktop after desktop research/article-images-2026-11-23/job35/S426/after"""
import json, sys, shutil, os
run, which, look, dest = sys.argv[1:5]
L = json.load(open(os.path.join(run, 'log.json')))
shots = [e for e in L['log'] if 'file' in e]
def g(e): return json.loads(e['sig'])
def f(e): return g(e).get('q', '').split('|')
def has(e, tok): return tok in f(e)
def tokp(e, pre): return next((t for t in f(e) if t.startswith(pre)), '')
import re
def num(e, pre):
    t = next((t for t in f(e) if re.fullmatch(pre + r'\d+', t)), '')
    return int(t[len(pre):]) if t else -1
def page(e): return f(e)[1] if len(f(e)) > 1 else ''
def upd(e): return g(e).get('upd', '')
picks = {}
def pick(name, pred, last=False):
    c = [e for e in shots if pred(e)]
    if c: picks[name] = (c[-1] if last else c[0])['file']
if which == 'after':
    # ⚑ S426e (his 24 Nov: "there was no way to scroll") — scrolled up during the news, the "▼ New messages" pill, back at the bottom
    pick('scroll_up', lambda e: e.get('why') == 'scroll-up')
    pick('scroll_new-messages', lambda e: e.get('why') == 'scroll-new-messages')
    pick('scroll_bottom', lambda e: e.get('why') == 'scroll-bottom')
    # ⚑ S426 (his 24 Nov, on S425's beat 10: "misaligned and on top of another layer") — her Notes, in the window's own column
    pick('notes_typing', lambda e: 'refTyping:part' in g(e).get('q', ''), last=True)
    pick('notes_written', lambda e: 'refTyping:all' in g(e).get('q', ''), last=True)
    pick('11a_news-bea', lambda e: has(e, 'news') and num(e, 'n') == 1 and has(e, 'w1'))
    pick('11b_news-card', lambda e: has(e, 'news') and num(e, 'n') == 2 and has(e, 'w1'), last=True)
    pick('11c_news-all-light', lambda e: (has(e, 'news') and num(e, 'n') == 5 or has(e, 'read')) and has(e, 'w1'), last=True)
    pick('12_urgent', lambda e: has(e, 'kit') and page(e) == '')
    pick('13_kit', lambda e: page(e) == 'kit' and not has(e, 'down') and not has(e, 'approved'), last=True)
    pick('14_take-down', lambda e: page(e) == 'kit' and has(e, 'down'), last=True)
    pick('15a_review-bar', lambda e: has(e, 'takeover') and has(e, 'w1') and num(e, 'r') == 0 and not tokp(e, 'rv:'))
    pick('15b_removing-card', lambda e: tokp(e, 'rv:n1:removing') != '')
    pick('15c_greyed', lambda e: tokp(e, 'rv:').endswith(':grey') and tokp(e, 'rv:').startswith('rv:n'))
    pick('15d_folded', lambda e: has(e, 'takeover') and num(e, 'r') == 4 and num(e, 'c') == 0, last=True)
    pick('16_forwards', lambda e: e.get('why') == 'press-mirror:forward-link' or (has(e, 'takeover') and num(e, 'c') >= 1 and not has(e, 'fwd')))
    pick('17_her-forward', lambda e: has(e, 'fwd') and has(e, 'w1'))
    pick('18_could-not-keep-up', lambda e: has(e, 'after') and has(e, 'w1'))
    pick('19_last-beat', lambda e: has(e, 'after') and has(e, 'w0') and not upd(e), last=True)
    pick('20_update', lambda e: upd(e) == 'notify')
else:
    # today's build, from the same tool (the phone's "before"): the stills S421's T22–T36 have for the computer and the headset
    pick('12_urgent', lambda e: has(e, 'kit') and page(e) == '', last=True)
    pick('13_kit', lambda e: page(e) == 'kit' and not has(e, 'down'), last=True)
    pick('14_take-down', lambda e: page(e) == 'kit' and has(e, 'down'), last=True)
    pick('11a_news-bea', lambda e: has(e, 'news') and num(e, 'n') == 1)
    pick('11b_news-card', lambda e: has(e, 'news') and num(e, 'n') == 2, last=True)
    pick('11c_news-all-light', lambda e: has(e, 'news') and num(e, 'n') >= 3 and not has(e, 'alert'))
    pick('11d_priority-alert', lambda e: has(e, 'alert'))
    pick('11e_reply', lambda e: has(e, 'reply'))
    pick('15a_review-bar', lambda e: has(e, 'talert'))
    pick('15b_removing-card', lambda e: has(e, 'takeover') and num(e, 'r') in (1, 2, 3), last=True)
    pick('16_forwards', lambda e: has(e, 'takeover') and num(e, 'c') >= 1, last=True)
    pick('18_could-not-keep-up', lambda e: has(e, 'after'))
    pick('19_last-beat', lambda e: has(e, 'after') and not upd(e), last=True)
    pick('20_update', lambda e: upd(e) == 'notify')
os.makedirs(dest, exist_ok=True)
for name, fn in picks.items():
    shutil.copy(os.path.join(run, fn), os.path.join(dest, f'{name}_{look}.png'))
    e = next(x for x in shots if x['file'] == fn)
    print(f'{name:24s} {fn:40s} t={e["t"]} dc={e.get("drawCalls")}')
