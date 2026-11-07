/** Narrative navigation only, never an intake or witness record. Felt reading is not filed. */
export const veraDay = {
  distributed: false, recordOpened: false, recordClosed: false, kitClosed: false,
  personalMessageSeen: false, phoneAnswered: false, voted: false, cascadeSeen: false, quiet: false
};
export function resetVeraDay(): void {
  Object.assign(veraDay, { distributed: false, recordOpened: false, recordClosed: false, kitClosed: false, personalMessageSeen: false, phoneAnswered: false, voted: false, cascadeSeen: false, quiet: false });
}
