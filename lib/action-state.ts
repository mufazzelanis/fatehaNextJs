export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** echoed back so forms keep their values after a failed submit */
  values?: Record<string, string>;
};

export const initialState: ActionState = {};
