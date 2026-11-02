export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  /** One-time invitation link to hand to the invitee (platform admins only). */
  link?: string;
  /** Echoed back on validation errors so forms do not lose what the user typed. */
  values?: Record<string, string>;
};
