import { beforeEach, describe, expect, test, vi } from "vitest";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
  key() { return null; }
  get length() { return this.data.size; }
}

const storage = new MemoryStorage();
vi.stubGlobal("localStorage", storage);

async function freshStore() {
  vi.resetModules();
  const mod = await import("@/lib/store/session");
  return mod;
}

const T0 = 1_700_000_000_000;

beforeEach(() => storage.clear());

describe("session store", () => {
  test("records events in order through a short session", async () => {
    const { useSession } = await freshStore();
    const s = useSession.getState();
    s.start(T0);
    s.goTo(1, T0 + 5000);
    useSession.getState().select("q2", "B", T0 + 7000);
    useSession.getState().finish("finish", T0 + 9000);
    const st = useSession.getState();
    expect(st.events.map((e) => e.type)).toEqual([
      "module_start", "question_enter", "question_leave", "question_enter", "answer_select", "question_leave", "module_end",
    ]);
    expect(st.events.map((e) => e.t)).toEqual([0, 0, 5000, 5000, 7000, 9000, 9000]);
    expect(st.status).toBe("finished");
    expect(st.answers.q2).toBe("B");
  });

  test("actions after finish are ignored", async () => {
    const { useSession } = await freshStore();
    useSession.getState().start(T0);
    useSession.getState().finish("finish", T0 + 1000);
    const n = useSession.getState().events.length;
    useSession.getState().select("q1", "A", T0 + 2000);
    useSession.getState().goTo(3, T0 + 2000);
    expect(useSession.getState().events).toHaveLength(n);
    expect(useSession.getState().answers.q1).toBeUndefined();
  });

  test("finish with Desmos open closes it first", async () => {
    const { useSession } = await freshStore();
    useSession.getState().start(T0);
    useSession.getState().setDesmos(true, T0 + 1000);
    useSession.getState().finish("finish", T0 + 2000);
    const types = useSession.getState().events.map((e) => e.type);
    expect(types.slice(-3)).toEqual(["desmos_close", "question_leave", "module_end"]);
  });

  test("rehydrate-before-deadline keeps the same deadline", async () => {
    const a = await freshStore();
    a.useSession.getState().start(T0);
    a.useSession.getState().select("q1", "C", T0 + 1000);
    const deadline = a.useSession.getState().deadline;
    const b = await freshStore();
    await b.useSession.persist.rehydrate();
    b.useSession.getState().checkDeadline(T0 + 60_000);
    expect(b.useSession.getState()).toMatchObject({ status: "active", deadline, answers: { q1: "C" } });
  });

  test("rehydrate-after-deadline ends as timeout", async () => {
    const a = await freshStore();
    a.useSession.getState().start(T0);
    const b = await freshStore();
    await b.useSession.persist.rehydrate();
    b.useSession.getState().checkDeadline(T0 + 36 * 60_000);
    const st = b.useSession.getState();
    expect(st.status).toBe("finished");
    expect(st.events.at(-1)).toMatchObject({ type: "module_end", payload: { reason: "timeout" }, t: 35 * 60_000 });
  });

  test("corrupt-storage-resets", async () => {
    const { STORAGE_KEY } = await freshStore();
    for (const raw of ["{not json", JSON.stringify({ state: { status: "active" }, version: 0 })]) {
      storage.setItem(STORAGE_KEY, raw);
      const { useSession } = await freshStore();
      await useSession.persist.rehydrate();
      expect(useSession.getState().status).toBe("idle");
      expect(useSession.getState().events).toEqual([]);
    }
  });

  test("drills record answers and reseed", async () => {
    const { useSession } = await freshStore();
    useSession.getState().answerDrill("q3", "B", true);
    expect(useSession.getState().drills.q3).toMatchObject({ answer: "B", correct: true });
    const seed = useSession.getState().drills.q3.seed;
    useSession.getState().newDrillSeed("q3");
    expect(useSession.getState().drills.q3).toMatchObject({ seed: seed + 1, answer: null, correct: null });
  });
});
