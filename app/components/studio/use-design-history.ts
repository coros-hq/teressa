import { useCallback, useReducer } from "react";

import { syncGroups, type DesignObject } from "./design-model";

type Update = DesignObject[] | ((objects: DesignObject[]) => DesignObject[]);

type State = {
  past: DesignObject[][];
  present: DesignObject[];
  future: DesignObject[][];
  /** The kind of change that was made last, so a run of the same kind becomes one undo step. */
  lastKey: string | null;
  lastAt: number;
};

type Action =
  | { type: "set"; update: Update; key?: string; now: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "seal" }
  | { type: "reset"; objects: DesignObject[] };

const LIMIT = 100;
// Typing in a field is one step until you pause this long.
const TYPING_GAP_MS = 1200;

const empty: State = { past: [], present: [], future: [], lastKey: null, lastAt: 0 };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set": {
      // Groups always fit their members, however the change was made.
      const next = syncGroups(typeof action.update === "function" ? action.update(state.present) : action.update);
      
      if (next === state.present) return state;
      // Keys starting with "g:" are gestures (a drag, a resize): they stay one step until sealed.
      // Other keys (typing) stay one step until you pause.
      const same =
        action.key !== undefined &&
        action.key === state.lastKey &&
        (action.key.startsWith("g:") || action.now - state.lastAt < TYPING_GAP_MS);
      return {
        past: same ? state.past : [...state.past, state.present].slice(-LIMIT),
        present: next,
        future: [],
        lastKey: action.key ?? null,
        lastAt: action.now,
      };
    }
    case "undo": {
      if (!state.past.length) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
        lastKey: null,
        lastAt: 0,
      };
    }
    case "redo": {
      if (!state.future.length) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
        lastKey: null,
        lastAt: 0,
      };
    }
    case "seal":
      return state.lastKey === null ? state : { ...state, lastKey: null };
    case "reset":
      return { ...empty, present: syncGroups(action.objects) };
  }
}

// The canvas contents with undo and redo. Pass a `key` for changes that come in a stream (a drag,
// typing) so the whole stream is one step; leave it out for one-off changes.
export function useDesignHistory() {
  const [state, dispatch] = useReducer(reducer, empty);

  const setObjects = useCallback(
    (update: Update, key?: string) => dispatch({ type: "set", update, key, now: Date.now() }),
    []
  );
  return {
    objects: state.present,
    setObjects,
    /** Ends the current stream of changes, so the next change is a new step. */
    seal: useCallback(() => dispatch({ type: "seal" }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
    /** Replaces everything without making an undo step (used when loading). */
    reset: useCallback((objects: DesignObject[]) => dispatch({ type: "reset", objects }), []),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
