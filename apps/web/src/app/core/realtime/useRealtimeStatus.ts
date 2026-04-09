import { useSyncExternalStore } from "react";
import { realtimeStore } from "./realtimeStore";

export function useRealtimeStatus() {
  return useSyncExternalStore(realtimeStore.subscribe, realtimeStore.getSnapshot);
}
