/**
 * The fluid trans niche — GREYBOX (docs/REINTERP_FLUID_TRANS_ROOM_GEOMETRY_2026
 * -07-03.md; behind ?reinterp=1 only). ONE shallow alcove on the ±110° rear-
 * lateral arc (the colder side, doc §3.1), holding THREE facet stations at
 * EQUAL fidelity (transfem / transmasc / nonbinary — Round 16 de-gate: no
 * greybox-until-consult split). Facets are STATES of one volume, not places you
 * go (§1.1): the player turns once; the facet resolves in place.
 *
 * Quest discipline (§4.3): the three stations SHARE meshes (one box resource)
 * and just TWO materials — a fog "unresolved silhouette" skin and a hero
 * "resolved/lit" skin — swapped by reference on foreground, plus one small omni
 * per station toggled on. Foregrounding is a material/light toggle, never a
 * spawn. Facet objects here are PLACEHOLDER blocks (hero-object slots); the
 * niche anchor is read from data/room/fluid_niche.json, block geometry is code
 * (00_START_HERE: geometry/layout in .ts). Era palette tokens only.
 *
 * setFacet() is the whole runtime interface — the seam a later session wires
 * gaze-dwell (§2.2 #3) and cross-cluster sends (§2.2 #2) into. This session
 * ships those as DATA STUBS only (fluid_niche.json `pull`); nothing calls
 * setFacet except the ?facet= debug override / the era default.
 */
import * as pc from 'playcanvas';
import { ERA1 } from '../desktop/theme/era1';
import niche from '../../data/room/fluid_niche.json';

export type FacetState = 'transfem' | 'transmasc' | 'nonbinary' | 'all' | 'none';

/** the three stations, in the fixed left→right order the table declares */
const STATIONS = niche.stations as FacetState[];
/** lateral spread of the stations along the wall (z), inside the ±15° cone */
const STATION_DZ = [-0.24, 0, 0.24];
const HERO_LIGHT = 2.2; // intensity when a facet is foregrounded (0 = fog/dark)

function hex(c: string): pc.Color {
  const n = parseInt(c.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function box(name: string, pos: number[], size: number[], mat: pc.StandardMaterial): pc.Entity {
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'box' });
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  e.setLocalScale(size[0], size[1], size[2]);
  if (e.render) e.render.material = mat;
  return e;
}

export interface FluidNiche {
  /** foreground a facet (or 'all' = the E3 triptych, 'none' = E1 near-dark) —
   *  a material/light toggle on shared meshes; the send/gaze seam calls this */
  setFacet(state: FacetState): void;
  /** station world positions, for the gaze-dwell resolver (§2.2 #3) */
  readonly stations: { facet: FacetState; pos: pc.Vec3 }[];
}

export function buildFluidNiche(app: pc.Application): FluidNiche {
  const root = new pc.Entity('fluid-niche');
  const [ax, ay, az] = niche.niche.center as number[];
  const yawDeg = (niche.niche as { yawDeg?: number }).yawDeg ?? 0;
  // children are authored in the niche's LOCAL frame (facing -x); the root
  // carries the world anchor + yaw (Session 12: the niche stands on the east
  // wedge's back wall, rotated to face the hub like everything in that room)
  root.setLocalPosition(ax, ay, az);
  root.setLocalEulerAngles(0, yawDeg, 0);
  const cx = 0, cy = 0, cz = 0;

  // ── three shared materials (§4.3: two station skins + one structural) ──
  const structuralMat = new pc.StandardMaterial(); // cool dark recess (colder = witness-adjacent)
  structuralMat.diffuse = hex(ERA1.tealDark);
  structuralMat.update();
  const fogMat = new pc.StandardMaterial();        // the unresolved silhouette
  fogMat.diffuse = hex(ERA1.greyDark);
  fogMat.update();
  const heroMat = new pc.StandardMaterial();       // resolved/lit (glows)
  heroMat.useLighting = false;
  heroMat.diffuse = new pc.Color(0, 0, 0);
  heroMat.emissive = hex(ERA1.silver);
  heroMat.update();

  // ── the alcove shell (structural; frames the recess on the east wall) ──
  root.addChild(box('niche-backing', [cx + 0.07, cy + 0.04, cz], [0.04, 0.86, 1.00], structuralMat));
  root.addChild(box('niche-lintel',  [cx,        cy + 0.44, cz], [0.18, 0.06, 1.06], structuralMat));
  root.addChild(box('niche-sill',    [cx - 0.02, cy - 0.24, cz], [0.20, 0.05, 0.98], structuralMat));
  root.addChild(box('niche-jambL',   [cx + 0.01, cy + 0.04, cz - 0.50], [0.16, 0.86, 0.06], structuralMat));
  root.addChild(box('niche-jambR',   [cx + 0.01, cy + 0.04, cz + 0.50], [0.16, 0.86, 0.06], structuralMat));

  // ── three equal-fidelity facet stations (shared box mesh, fog by default) ──
  const stationEnts: pc.Entity[] = [];
  const stationLights: pc.Entity[] = [];
  STATIONS.forEach((facet, i) => {
    const sz = cz + STATION_DZ[i];
    const st = box(`facet-${facet}`, [cx - 0.04, cy - 0.05, sz], [0.16, 0.30, 0.16], fogMat);
    root.addChild(st);
    stationEnts.push(st);

    const light = new pc.Entity(`facet-light-${facet}`);
    light.addComponent('light', {
      type: 'omni',
      color: hex(ERA1.beige), // a warm resolve pool against the cool recess
      intensity: 0,           // off until foregrounded
      range: 0.85,
      castShadows: false
    });
    light.setLocalPosition(cx - 0.24, cy + 0.10, sz);
    root.addChild(light);
    stationLights.push(light);
  });

  app.root.addChild(root);
  // Round 24: the niche's anchor is stranded at the OLD hexagon-wedge coords, so
  // in the three-room layout it floats in the Room 1↔Room 3 doorway. There is no
  // clean free wall for it in the new Room 3 (shelf + bed take both side walls),
  // and Phase C rebuilds it in place as Sérgio's color-coded trans-flag facets
  // (pink/blue/white with a back-and-forth morph wave). Until then, `hidden`
  // keeps it OUT of the sightline without deleting the facet system.
  if ((niche.niche as { hidden?: boolean }).hidden) root.enabled = false;

  function setFacet(state: FacetState): void {
    STATIONS.forEach((facet, i) => {
      const lit = state === 'all' || state === facet;
      const st = stationEnts[i];
      if (st.render) st.render.material = lit ? heroMat : fogMat; // reference swap, no realloc
      const l = stationLights[i];
      if (l.light) l.light.intensity = lit ? HERO_LIGHT : 0;
    });
  }

  return {
    setFacet,
    // world positions for the gaze resolver (the root is rotated, so read them
    // back from the placed entities rather than recomputing the math here)
    stations: STATIONS.map((facet, i) => ({
      facet,
      pos: stationEnts[i].getPosition().clone()
    }))
  };
}
