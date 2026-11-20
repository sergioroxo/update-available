"""Who wrote the words: a read-only count of every text string in data/ (S357es, 20 Nov 2026).

Uses the rules of tools/voice-pass.mjs (display strings; `_s` / `_s_<key>` mark his own verbatim wording) over
all of data/, and sorts each string into: his (marked), tapes (teaching-tape captions), sourced (Dossier, Lexicon,
the Close, era sites, credits) and ai (everything else). Run from the repo root: python3 tools/authorship-count.py
Reported in docs/reinterp/DECISION_LOG_AND_COUNTS_2026-11-20.md section 3. Writes nothing."""
import json,re,glob,os,collections
ROOT='.'
SKIP=re.compile(r'^(_|id$|goto$|ledgerTag$|register$|era$|status$|confidence$|sources$|url|file|track|readAloudTrack|model|key|accepted$|why$)')
def is_display(k,v):
  return isinstance(v,str) and len(v)>2 and not SKIP.match(str(k)) and not re.match(r'^(https?:|#[0-9a-f]{3,8}$|[a-z0-9_./-]+\.(json|glb|mp3|png|wav|mp4|webm|jpg|svg)$)',v,re.I) and re.search(r'[a-zA-Z]',v) and re.search(r"[ .,!?'\"—…]",v)
def walk(n,trail,out,locked=False):
  if isinstance(n,list):
    for i,v in enumerate(n): walk(v,trail+[i],out,locked)
    return
  if isinstance(n,dict):
    self_locked = locked or bool(n.get('_s'))
    lk={k[3:] for k in n if isinstance(k,str) and k.startswith('_s_')}
    for k,v in n.items():
      if k=='_s' or (isinstance(k,str) and k.startswith('_s_')): continue
      walk(v,trail+[k],out,self_locked or k in lk)
    return
  key=trail[-1] if trail else ''
  if is_display(key if not isinstance(key,int) else (trail[-2] if len(trail)>1 else ''),n):
    out.append((trail,n,locked))
files=[f for f in glob.glob('data/**/*.json',recursive=True) if '/_archive/' not in f and 'schema' not in f and not f.endswith('_model.json') and 'tts_manifest' not in f and '/_dummy' not in f]
SOURCED=('data/dossier/','data/provotypes/','data/strings/lexicon.json','data/strings/close_network.json','data/strings/era_sites.json','data/strings/close_message.json','data/strings/attributions.json')
cat=collections.defaultdict(lambda:[0,0]); mine=[]
def words(s): return len(re.findall(r"[A-Za-zÀ-ÿ0-9'’]+",s))
for f in sorted(files):
  try: d=json.load(open(f))
  except Exception as e: print('skip',f,e); continue
  out=[]; walk(d,[],out)
  for trail,t,locked in out:
    if locked: c='his'; mine.append((f,'.'.join(map(str,trail)),t))
    elif f=='data/room/teaching_tapes.json' and 'cues' in trail: c='tapes'
    elif f.startswith(SOURCED): c='sourced'
    else: c='ai'
    cat[c][0]+=1; cat[c][1]+=words(t)
tot=[sum(v[0] for v in cat.values()), sum(v[1] for v in cat.values())]
print('files',len(files)); print('total strings',tot[0],'words',tot[1])
for c,(n,w) in sorted(cat.items()): print(f'{c:8} {n:6} strings {w:7} words  {100*w/tot[1]:.2f}%')
print('--- his locked lines')
for f,p,t in mine: print(f,p,'|',t[:110].replace('\n',' '))
