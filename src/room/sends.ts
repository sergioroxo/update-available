/**
 * The SEND runtime — the seam the content beats will call (master script §4:
 * "a send is a summons, not a door"). Data lives in data/sends.json (structure
 * + placeholder witness copy); this module only executes the law:
 *
 *   offer(id)   — the guide names a reason; files symmetrically-shaped record
 *   visit(id)   — the player turned and read: foreground the target facet
 *                 (niche.setFacet — the seam S6/S8 built), land the physical
 *                 carry-back on the sender's desk (◆N2: the desk silts up),
 *                 and file the terminal cross-reference line
 *   decline(id) — always possible, files symmetrically (Ethics #10 both ways)
 *
 * Every outcome writes ledger.sends (in-memory only, like everything) with the
 * witness line resolved FROM DATA, never composed here — the provotype filing
 * pattern (R1), exactly. Each (id, outcome) files once; re-fires are no-ops.
 * No beat in this worktree triggers sends yet (the trigger beats are content
 * sessions / the main-merge lane) — until then ?debug=1 carries review buttons.
 *
 * Carry-back props are OWN entities under the room root (they vanish with it
 * at the Close) but NOT in room.props — the morph's deterministic fold must
 * never see ids that aren't in the delta data. Placement is greybox, data-
 * driven, flagged for the moodboard pass.
 */
import * as pc from 'playcanvas';
import sendsData from '../../data/sends.json';
import { ledger } from '../state/ledger';
import { hex, type RoomHandles } from './era1room';
import type { FluidNiche, FacetState } from './fluidNiche';

export type SendOutcome = 'offered' | 'visited' | 'declined';

interface SendDef {
  id: string;
  era: string;
  label: string;
  target: { kind: 'bay' | 'facet'; yaw?: number; facet?: string };
  extraTags?: string[];
  carryBack: { pos: number[]; size: number[]; color: string } | null;
  witness: Record<string, string>;
}

export interface SendRuntime {
  /** send ids in script order (debug panel buttons) */
  readonly ids: { id: string; label: string }[];
  fire(id: string, outcome: SendOutcome): void;
  /** where the summons points: a bay's seat yaw, or Room 3 (270) for a facet */
  targetYaw(id: string): number | null;
}

export function createSendRuntime(room: RoomHandles, niche: FluidNiche | null): SendRuntime {
  const defs = (sendsData as unknown as { sends: SendDef[] }).sends;
  const byId = new Map(defs.map(d => [d.id, d]));

  function filedAlready(id: string, outcome: SendOutcome): boolean {
    return ledger.sends.some(s => s.id === id && s.outcome === outcome);
  }

  function landCarryBack(def: SendDef): void {
    if (!def.carryBack) return;
    const name = `carryback-${def.id}`;
    if (room.root.findByName(name)) return; // already on the desk
    const cb = def.carryBack;
    const material = new pc.StandardMaterial();
    material.diffuse = hex(cb.color);
    material.update();
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'box' });
    if (e.render) e.render.material = material;
    e.setLocalPosition(cb.pos[0], cb.pos[1], cb.pos[2]);
    e.setLocalScale(cb.size[0], cb.size[1], cb.size[2]);
    room.root.addChild(e);
  }

  return {
    ids: defs.map(d => ({ id: d.id, label: d.label })),

    targetYaw(id: string): number | null {
      const def = byId.get(id);
      if (!def) return null;
      if (def.target.kind === 'bay') return def.target.yaw ?? null;
      return 270; // every facet lives in Room 3 (east)
    },

    fire(id: string, outcome: SendOutcome): void {
      const def = byId.get(id);
      if (!def || filedAlready(id, outcome)) return;
      // the record: witness line resolved from data + the mechanical tag
      ledger.sends.push({ id, outcome, witness: def.witness[outcome] ?? `${id}: ${outcome}` });
      const tag = `send:${id}:${outcome}`;
      if (!ledger.tags.includes(tag)) ledger.tags.push(tag);

      if (outcome === 'visited') {
        for (const t of def.extraTags ?? []) {
          if (!ledger.tags.includes(t)) ledger.tags.push(t);
        }
        // the summons resolves: a facet target foregrounds through the built
        // seam (a bay target is a turn the camera already owns — no latch)
        if (def.target.kind === 'facet' && def.target.facet && niche) {
          niche.setFacet(def.target.facet as FacetState);
        }
        landCarryBack(def);
      }
    }
  };
}
