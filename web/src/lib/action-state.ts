export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  /** Echoed back on validation errors so forms do not lose what the user typed. */
  values?: Record<string, string>;
};
