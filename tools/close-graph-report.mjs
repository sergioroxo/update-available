#!/usr/bin/env node
/**
 * READ-ONLY report: what the Close constellation's knowledge graph would contain
 * if it were derived from the build instead of hand-typed.
 *
 * Writes nothing. Changes no data, touches no engine code. This exists so the
 * shape can be judged before anything moves — see
 * data/strings/_close_network.schema.json for the proposed target.
 *
 * The claim being tested: the piece's final image is canonically "the network of
 * knowledge the piece itself is built from" (src/room/pointCloud.ts), but its
 * topology is currently procedural — random positions, links by spatial
 * proximity, labels assigned to whatever rendered largest. Meanwhile the real
 * network already exists in data/provotypes/*.json, where every debrief source
 * carries a status the dossier law requires. This prints what is actually there.
 *
 * ETHICS: this tool deliberately does NOT emit labels for derived nodes. Source
 * texts name real people and cases; the Close's own rule is "sources and
 * structures only". Structure is derivable, wording is Sérgio's.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROVOTYPES = join(ROOT, 'data/provotypes');
const FIXTURES = ['_schema.json', '_dummy.json']; // fixtures never become stars

const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

const sources = new Map(); // normalized text -> { status, confidence, verified, cited[] }
const scenes = [];

for (const name of existsSync(PROVOTYPES) ? readdirSync(PROVOTYPES) : []) {
  if (!name.endsWith('.json') || FIXTURES.includes(name)) continue;
  const p = JSON.parse(readFileSync(join(PROVOTYPES, name), 'utf8'));
  scenes.push({ id: p.id, era: p.era, register: p.register });
  for (const s of p.debrief?.sources ?? []) {
    const key = norm(s.text); // full text, never a prefix — near-identical sources stay distinct
    const hit = sources.get(key) ?? {
      status: s.status,
      confidence: s.confidence,
      verified: !s.text.includes('[VERIFY SOURCE]'),
      cited: []
    };
    hit.cited.push(p.id);
    sources.set(key, hit);
  }
}

const nodes = [...sources.values()];
const shared = nodes.filter((n) => n.cited.length > 1);
const unverified = nodes.filter((n) => !n.verified);
const byStatus = {};
for (const n of nodes) byStatus[n.status] = (byStatus[n.status] ?? 0) + 1;
const edges = nodes.reduce((sum, n) => sum + n.cited.length, 0);

// the authored population that no code can infer
const netPath = join(ROOT, 'data/strings/close_network.json');
const authored = existsSync(netPath) ? (JSON.parse(readFileSync(netPath, 'utf8')).labels ?? []) : [];

const LABEL_CAP = 32; // src/room/pointCloud.ts: labels.slice(0, 32)
const total = nodes.length + authored.length;

console.log(`
THE CLOSE — knowledge graph, derived (read-only, nothing was written)
════════════════════════════════════════════════════════════════════

DERIVED from data/provotypes/*.json debrief sources
  ${String(nodes.length).padStart(3)} distinct sources  (fixtures excluded: ${FIXTURES.join(', ')})
  ${String(edges).padStart(3)} real edges  — "source S grounds scene P", already recorded, nothing interpreted
  ${String(scenes.length).padStart(3)} scenes cited by them: ${scenes.map((s) => s.id).join(', ')}
  ${String(shared.length).padStart(3)} sources cited by MORE THAN ONE scene — the graph's actual value:
${shared.map((n) => `        · ${n.cited.join(' + ')}  [${n.status}]`).join('\n') || '        (none)'}

  status spread (assigned by the dossier data, never by tooling):
${Object.entries(byStatus).map(([k, v]) => `        ${k.padEnd(12)} ${v}`).join('\n')}
  unverified ([VERIFY SOURCE]): ${unverified.length}${unverified.length ? '  ← must not render as bright documentary stars' : ''}

AUTHORED (Sérgio's frame nodes, no code can infer these)
  ${String(authored.length).padStart(3)} existing labels in data/strings/close_network.json, preserved verbatim

TOTAL ${total} nodes vs the engine's label cap of ${LABEL_CAP}
  ${total > LABEL_CAP
    ? `⚠ ${total - LABEL_CAP} nodes would be silently dropped — pointCloud.ts does labels.slice(0, ${LABEL_CAP})`
    : `within cap (${LABEL_CAP - total} spare)`}

THE HONEST GAP
  the Close currently draws 320 nodes and links them by spatial proximity.
  real relations available right now: ${edges}. Every other line on screen is decoration
  in a piece whose rule is "cite only sources verified in the knowledge base".

NOT DONE HERE (deliberately): no labels derived from source text (they name real
people and cases), no interpretive edges between sources, no data migrated, no
engine change. Those are Sérgio's calls and separate sessions.
`);
