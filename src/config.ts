const rawApiBase = import.meta.env.VITE_API_BASE as string | undefined;

if (!rawApiBase) {
  throw new Error("Missing VITE_API_BASE. Set it in .env.local or .env.");
}

export const API_BASE = rawApiBase.replace(/\/+$/, "");
