"use client";

import { useSyncExternalStore } from "react";
import { useSession } from "./session";

const subscribe = (cb: () => void) => useSession.persist.onFinishHydration(cb);

/** True once the persisted session has been read on the client. Always false on the server. */
export function useSessionReady(): boolean {
  return useSyncExternalStore(subscribe, () => useSession.persist.hasHydrated(), () => false);
}
