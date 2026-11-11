/**
 * ⚑ S368 — THE READING RULE (UiB job 16, his 11 Nov: "timed prompts that are too fast"; docs/reinterp/UIB_JOB_16_2026-11-11.md
 * rule 1). No text leaves the screen by itself before a slow reader has read it: it holds at least 2 s + 0.4 s a word, or it
 * waits for a press. The named by-design exceptions (the 2016 cascade's speed, deliberate stillness) do not call this.
 *
 * One function, so every timed surface in the piece counts words the same way, and tools/flow-audit.mjs measures by the
 * same number.
 */
export const READ_BASE_SECONDS = 2;
export const READ_PER_WORD_SECONDS = 0.4;

/** words in a text (or in several lines read together) */
export function wordCount(text: string | readonly string[]): number {
  const s = Array.isArray(text) ? text.join(' ') : String(text);
  return s.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}

/** seconds a slow reader needs for this text: 2 s + 0.4 s a word (0 for no words) */
export function readHold(text: string | readonly string[]): number {
  const n = wordCount(text);
  return n ? READ_BASE_SECONDS + READ_PER_WORD_SECONDS * n : 0;
}
