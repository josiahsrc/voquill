import { ActionStatus } from "../types/state.types";

export type DictionaryState = {
  termIds: string[];
  status: ActionStatus;
};

export const INITIAL_DICTIONARY_STATE: DictionaryState = {
  termIds: [],
  status: "idle",
};
