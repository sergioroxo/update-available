#!/usr/bin/env python3
"""
tools/usage-cost.py — what the making of this piece cost in Claude tokens, priced at API list prices.

WHY (his ask, 12 Nov 2026: "is there a way since I got the UiB Claude, to know the cost of all the works? just as a
reference" — and: "add a task on the research so the other Claude account can also run that value on the earlier
versions of the project"). The figures are in docs/reinterp/ARTICLE_COMPANION_2026-10-31.md §7u.

WHAT IT READS. Claude Code keeps one local log per session (`<config dir>/projects/<folder>/<session>.jsonl`, with
subagents' logs beside it). Every reply carries its token usage and its model. This script adds those up, counting
each reply once (a reply split over several log lines shares one message id), and prices them at Anthropic's
first-party API list prices. It reads only local files. It sends nothing anywhere and changes nothing.

WHAT THE NUMBER MEANS. The API-equivalent cost: what the same tokens would cost on the API. On a Claude subscription
plan there is no per-token charge. Checked once against Claude Code's own session counter (12 Nov): this script
came out about 8% under it, so treat the result as a floor.

USAGE
  python3 tools/usage-cost.py                                   # ~/.claude/projects
  python3 tools/usage-cost.py --root ~/.claude-uib/projects     # another account's config folder
  python3 tools/usage-cost.py --root A --root B --since 2026-01-01 --until 2026-05-15 --json out.json
  python3 tools/usage-cost.py --match update-available          # only folders whose name contains this

Run it in each Claude account (or on each computer) that worked on the project, and add its rows to §7u.
Logs older than Claude Code's `cleanupPeriodDays` (30 days by default) may already be gone.
"""
import argparse, collections, glob, json, os, re, sys

# $ per million tokens: input, output, cache read, cache write (5-minute), cache write (1-hour)
RATES = {
    'claude-opus-5-5':   (4.00, 20.00, 0.20, 5.00, 8.00),
    'claude-sonnet-5-5': (2.00, 10.00, 0.10, 2.50, 4.00),
    'claude-haiku-5-5':  (0.10, 0.50, 0.01, 0.125, 0.20),
    'claude-fable-5-2':  (8.00, 40.00, 0.20, 10.00, 16.00),
    # Older models: list input/output prices; cache read assumed at 0.1x input, cache writes 1.25x / 2x (approximate).
    'claude-opus-5':     (5.00, 25.00, 0.50, 6.25, 10.00),
    'claude-opus-4-8':   (5.00, 25.00, 0.50, 6.25, 10.00),
    'claude-opus-4-7':   (5.00, 25.00, 0.50, 6.25, 10.00),
    'claude-opus-4-6':   (5.00, 25.00, 0.50, 6.25, 10.00),
    'claude-sonnet-5':   (2.00, 10.00, 0.20, 2.50, 4.00),
    'claude-sonnet-4-6': (3.00, 15.00, 0.30, 3.75, 6.00),
    'claude-sonnet-4-5': (3.00, 15.00, 0.30, 3.75, 6.00),
    'claude-fable-5':    (10.00, 50.00, 1.00, 12.50, 20.00),
    'claude-fable-5-1':  (10.00, 50.00, 1.00, 12.50, 20.00),
    'claude-haiku-4-5':  (1.00, 5.00, 0.10, 1.25, 2.00),
}


def rate_for(model):
    if not model:
        return None
    m = re.sub(r'-\d{8}$', '', model)          # drop a date suffix (claude-haiku-4-5-20251001)
    return RATES.get(m)


def folder_name(path, root):
    name = os.path.relpath(path, root).split(os.sep)[0]
    return re.sub(r'^-Users-[^-]+-', '', name)  # keep the project, drop the home folder's user name


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[1])
    ap.add_argument('--root', action='append', help='a Claude Code projects folder (repeatable); default ~/.claude/projects')
    ap.add_argument('--since', default='')
    ap.add_argument('--until', default='9999')
    ap.add_argument('--match', default='', help='only project folders whose name contains this')
    ap.add_argument('--json', help='also write every row (day, project, model, tokens, usd) here')
    a = ap.parse_args()
    roots = [os.path.expanduser(r) for r in (a.root or ['~/.claude/projects'])]

    seen, rows, unpriced = set(), collections.defaultdict(collections.Counter), collections.Counter()
    for root in roots:
        for f in glob.glob(os.path.join(root, '**', '*.jsonl'), recursive=True):
            proj = folder_name(f, root)
            if a.match and a.match not in proj:
                continue
            with open(f, errors='ignore') as fh:
                for line in fh:
                    if '"usage"' not in line:
                        continue
                    try:
                        o = json.loads(line)
                    except ValueError:
                        continue
                    msg = o.get('message') or {}
                    u, mid, model = msg.get('usage'), msg.get('id'), msg.get('model')
                    if not u or not mid:
                        continue
                    key = (mid, o.get('requestId'))
                    if key in seen:
                        continue
                    seen.add(key)
                    day = (o.get('timestamp') or '')[:10]
                    if not (a.since <= day <= a.until):
                        continue
                    if not rate_for(model):
                        if model != '<synthetic>':
                            unpriced[model] += 1
                        continue
                    cc = u.get('cache_creation') or {}
                    w5, w1 = cc.get('ephemeral_5m_input_tokens'), cc.get('ephemeral_1h_input_tokens')
                    if w5 is None and w1 is None:
                        w5, w1 = u.get('cache_creation_input_tokens') or 0, 0
                    c = rows[(day, proj, re.sub(r'-\d{8}$', '', model))]
                    c['in'] += u.get('input_tokens') or 0
                    c['out'] += u.get('output_tokens') or 0
                    c['cr'] += u.get('cache_read_input_tokens') or 0
                    c['w5'] += w5 or 0
                    c['w1'] += w1 or 0
                    c['replies'] += 1

    def usd(model, c):
        r = RATES[model]
        return (c['in'] * r[0] + c['out'] * r[1] + c['cr'] * r[2] + c['w5'] * r[3] + c['w1'] * r[4]) / 1e6

    if not rows:
        print('No priced replies found under', ', '.join(roots))
        return
    out = [dict(day=d, project=p, model=m, usd=round(usd(m, c), 2), **c) for (d, p, m), c in sorted(rows.items())]
    total = sum(r['usd'] for r in out)
    first, last = min(r['day'] for r in out), max(r['day'] for r in out)

    def table(title, key):
        agg = collections.Counter()
        for r in out:
            agg[key(r)] += r['usd']
        print(f'\n| {title} | API-equivalent |\n|---|---|')
        for k, v in (sorted(agg.items()) if title == 'month' else agg.most_common()):
            print(f'| {k} | ${v:,.2f} |')

    print(f'Claude Code usage, {first} to {last}: {sum(r["replies"] for r in out):,} replies, '
          f'about ${total:,.2f} at API list prices (a floor: about 8% under Claude Code\'s own counter).')
    table('month', lambda r: r['day'][:7])
    table('project folder', lambda r: r['project'])
    table('model', lambda r: r['model'])
    if unpriced:
        print('\nNot priced (add their rates to RATES):', dict(unpriced))
    if a.json:
        with open(a.json, 'w') as fh:
            json.dump(out, fh, indent=0)
        print('\nRows written to', a.json)


if __name__ == '__main__':
    sys.exit(main())
