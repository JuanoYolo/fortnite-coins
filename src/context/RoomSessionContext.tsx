/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";

export interface RoomSession {
  room_code: string;
  display_name: string;
  player_code: string;
}

interface RoomSessionContextValue {
  session: RoomSession | null;
  setSession: (next: RoomSession) => void;
  clearSession: () => void;
}

const STORAGE_KEY = "fortnite-coins-room-session";

const RoomSessionContext = createContext<RoomSessionContextValue | undefined>(undefined);

function readStoredSession(): RoomSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RoomSession>;
    if (
      typeof value.room_code !== "string" ||
      typeof value.display_name !== "string" ||
      typeof value.player_code !== "string"
    ) {
      return null;
    }
    return {
      room_code: value.room_code,
      display_name: value.display_name,
      player_code: value.player_code
    };
  } catch {
    return null;
  }
}

export function RoomSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<RoomSession | null>(() => readStoredSession());

  const value = useMemo<RoomSessionContextValue>(
    () => ({
      session,
      setSession: (next) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSessionState(next);
      },
      clearSession: () => {
        localStorage.removeItem(STORAGE_KEY);
        setSessionState(null);
      }
    }),
    [session]
  );

  return <RoomSessionContext.Provider value={value}>{children}</RoomSessionContext.Provider>;
}

export function useRoomSession() {
  const context = useContext(RoomSessionContext);
  if (!context) {
    throw new Error("useRoomSession must be used inside RoomSessionProvider");
  }
  return context;
}
