/** Option lists shared by client forms and server validation (no server imports here). */
export const KINDS = ["regular", "pre-event", "post-event", "weekly-update"] as const;
export const TONES = ["formal", "casual", "excited"] as const;
export const LENGTHS = ["short", "medium", "long"] as const;
/** Product areas a user can report against. Keep in sync with AREA_SCOPES in feedback.ts. */
export const AREAS = ["composer", "moderation", "feedback", "whats-new", "other"] as const;
