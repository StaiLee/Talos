export const ACTIVE_STATUSES = ["detecte", "en_cours", "shortliste", "poc"];
export const ARCHIVED_STATUSES = ["archive", "depose", "gagne", "perdu_non_retenu", "perdu_soutenance"];

export function isArchivedStatus(status: string) {
  return ARCHIVED_STATUSES.includes(status);
}
