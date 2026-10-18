import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { MODULE, MODULE_SECONDS } from "@/lib/content/module";
import { hashString } from "@/lib/engine/rng";
import type { ModuleEvent } from "@/lib/recorder/events";

export type SessionStatus = "idle" | "active" | "finished";

export type SessionState = {
  version: 1;
  status: SessionStatus;
  startedAt: number | null;
  /** epoch ms */
  deadline: number | null;
  events: ModuleEvent[];
  currentIndex: number;
  answers: Record<string, string>;
  marked: Record<string, boolean>;
  eliminated: Record<string, string[]>;
  desmosOpen: boolean;
  desmosAvailable: boolean;
  drills: Record<string, { seed: number; answer: string | null; correct: boolean | null }>;
};

export type SessionActions = {
  start(now?: number): void;
  goTo(index: number, now?: number): void;
  select(qid: string, answer: string, now?: number): void;
  clear(qid: string, now?: number): void;
  eliminate(qid: string, label: string, now?: number): void;
  toggleMark(qid: string, now?: number): void;
  setDesmos(open: boolean, now?: number): void;
  setDesmosAvailable(ok: boolean): void;
  finish(reason: "finish" | "timeout", now?: number): void;
  checkDeadline(now?: number): void;
  answerDrill(qid: string, answer: string, correct: boolean): void;
  newDrillSeed(qid: string): void;
  reset(): void;
};

export const STORAGE_KEY = "filmroom:session:v1";
const VERSION = 1;

const initialState = (): SessionState => ({
  version: 1,
  status: "idle",
  startedAt: null,
  deadline: null,
  events: [],
  currentIndex: 0,
  answers: {},
  marked: {},
  eliminated: {},
  desmosOpen: false,
  desmosAvailable: true,
  drills: {},
});

// Wraps every read/write so private mode, quota errors or corrupt JSON never throw.
const safeStorage: PersistStorage<SessionState> = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name);
      return raw ? (JSON.parse(raw) as StorageValue<SessionState>) : null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch {}
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {}
  },
};

const qidAt = (i: number) => MODULE[i]?.qid;

export const useSession = create<SessionState & SessionActions>()(
  persist(
    (set, get) => {
      const active = () => get().status === "active";
      const at = (now: number) => now - (get().startedAt ?? now);
      const push = (...events: ModuleEvent[]) => set((s) => ({ events: [...s.events, ...events] }));

      return {
        ...initialState(),

        start(now = Date.now()) {
          if (get().status !== "idle") return;
          set({ ...initialState(), status: "active", startedAt: now, deadline: now + MODULE_SECONDS * 1000 });
          push({ t: 0, type: "module_start" }, { t: 0, type: "question_enter", qid: qidAt(0) });
        },

        goTo(index, now = Date.now()) {
          const { currentIndex } = get();
          if (!active() || index === currentIndex || !qidAt(index)) return;
          const t = at(now);
          push({ t, type: "question_leave", qid: qidAt(currentIndex) }, { t, type: "question_enter", qid: qidAt(index) });
          set({ currentIndex: index });
        },

        select(qid, answer, now = Date.now()) {
          if (!active() || get().answers[qid] === answer) return;
          push({ t: at(now), type: "answer_select", qid, payload: { answer } });
          set((s) => ({ answers: { ...s.answers, [qid]: answer } }));
        },

        clear(qid, now = Date.now()) {
          if (!active() || get().answers[qid] === undefined) return;
          push({ t: at(now), type: "answer_clear", qid });
          set((s) => {
            const answers = { ...s.answers };
            delete answers[qid];
            return { answers };
          });
        },

        eliminate(qid, label, now = Date.now()) {
          if (!active()) return;
          push({ t: at(now), type: "choice_eliminate", qid, payload: { choice: label } });
          set((s) => {
            const cur = s.eliminated[qid] ?? [];
            const next = cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label];
            return { eliminated: { ...s.eliminated, [qid]: next } };
          });
        },

        toggleMark(qid, now = Date.now()) {
          if (!active()) return;
          push({ t: at(now), type: "mark_toggle", qid });
          set((s) => ({ marked: { ...s.marked, [qid]: !s.marked[qid] } }));
        },

        setDesmos(open, now = Date.now()) {
          if (!active() || get().desmosOpen === open) return;
          push({ t: at(now), type: open ? "desmos_open" : "desmos_close", qid: qidAt(get().currentIndex) });
          set({ desmosOpen: open });
        },

        setDesmosAvailable(ok) {
          set({ desmosAvailable: ok });
        },

        finish(reason, now = Date.now()) {
          if (!active()) return;
          const { deadline, startedAt, currentIndex, desmosOpen } = get();
          // A timeout is stamped at the deadline, even if noticed later (e.g. after a refresh).
          const t = reason === "timeout" && deadline && startedAt ? Math.min(now, deadline) - startedAt : at(now);
          const qid = qidAt(currentIndex);
          if (desmosOpen) push({ t, type: "desmos_close", qid });
          push({ t, type: "question_leave", qid }, { t, type: "module_end", payload: { reason } });
          set({ status: "finished", desmosOpen: false });
        },

        checkDeadline(now = Date.now()) {
          const { deadline } = get();
          if (active() && deadline !== null && now >= deadline) get().finish("timeout", now);
        },

        answerDrill(qid, answer, correct) {
          set((s) => {
            const seed = s.drills[qid]?.seed ?? hashString(qid) + 1;
            return { drills: { ...s.drills, [qid]: { seed, answer, correct } } };
          });
        },

        newDrillSeed(qid) {
          set((s) => {
            const seed = (s.drills[qid]?.seed ?? hashString(qid) + 1) + 1;
            return { drills: { ...s.drills, [qid]: { seed, answer: null, correct: null } } };
          });
        },

        reset() {
          set(initialState());
        },
      };
    },
    {
      name: STORAGE_KEY,
      version: VERSION,
      storage: safeStorage,
      // Hydrated explicitly on the client (see SessionHydrator) to avoid SSR mismatches.
      skipHydration: true,
      partialize: (s) => {
        const { version, status, startedAt, deadline, events, currentIndex, answers, marked, eliminated, desmosOpen, desmosAvailable, drills } = s;
        return { version, status, startedAt, deadline, events, currentIndex, answers, marked, eliminated, desmosOpen, desmosAvailable, drills } as SessionState & SessionActions;
      },
      migrate: () => initialState() as SessionState & SessionActions,
    },
  ),
);
