"""S425 (UiB job 35 Part D, Act II): pick the Act II stills from a run's log.json by what they show (the sig), copy them to S425/<before|after>/<nn>_<what>_<look>.png"""
import json, sys, shutil, os
run, which, look, dest = sys.argv[1:5]
L = json.load(open(os.path.join(run, 'log.json')))
shots = [e for e in L['log'] if 'file' in e]
def q(e): return json.loads(e['sig']).get('q', '')
def f(e): return q(e).split('|')
NEW = which == 'after'
# field positions in the sig's q (see tools/s425-act2-stills.mjs sigOf)
def has(e, tok): return tok in f(e)
picks = {}
def first(name, pred, last=False):
    c = [e for e in shots if pred(e)]
    if c: picks[name] = (c[-1] if last else c[0])['file']
if NEW:
    first('01_memory-card', lambda e: has(e, 'offer') and not has(e, 'record'))
    first('01b_memory-card-again', lambda e: has(e, 'again') and not has(e, 'record'))
    first('02_published', lambda e: has(e, 'record') and not has(e, 'sent'))
    first('03_own-words', lambda e: has(e, 'record') and has(e, 'sent') and has(e, 'wait'))
    first('04_notes-typing', lambda e: 'refTyping:part' in q(e))
    first('05_notes-written', lambda e: 'refTyping:all' in q(e))
    first('06_nuala', lambda e: has(e, 'nuala') and has(e, 'lock') and not has(e, 'kit'), last=True)
    first('07_kit-over-the-page', lambda e: has(e, 'kit'))
else:
    first('01_memory-card', lambda e: has(e, 'offer') and not has(e, 'record'))
    first('02_published', lambda e: has(e, 'record') and not has(e, 'sent'))
    first('03_own-words', lambda e: has(e, 'record') and has(e, 'sent'))
    first('04_notes-typing', lambda e: 'mamTyping' in q(e) or 'refTyping:part' in q(e))
    first('05_notes-written', lambda e: 'refTyping:all' in q(e) or ('written' in f(e) and 'notes' in f(e)))
    first('06_nuala', lambda e: has(e, 'nuala') and not has(e, 'kit'), last=True)
    first('07_kit-over-the-page', lambda e: has(e, 'kit'))
os.makedirs(dest, exist_ok=True)
for name, fn in picks.items():
    shutil.copy(os.path.join(run, fn), os.path.join(dest, f'{name}_{look}.png'))
    print(name, fn)
