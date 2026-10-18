"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/store/session";

/** Reads the saved session once on the client, then ends it if the deadline passed while away. */
export function SessionHydrator() {
  useEffect(() => {
    void Promise.resolve(useSession.persist.rehydrate()).then(() => useSession.getState().checkDeadline());
  }, []);
  return null;
}
