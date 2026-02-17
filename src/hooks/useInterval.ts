import { useEffect, useRef } from "react";

export function useInterval(callback: () => void, delayMs: number) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    const id = window.setInterval(() => {
      saved.current();
    }, delayMs);

    return () => window.clearInterval(id);
  }, [delayMs]);
}
