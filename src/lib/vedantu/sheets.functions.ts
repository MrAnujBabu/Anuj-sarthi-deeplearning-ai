/**
 * Admin-only RPC for the AITS Test Tracker sheet (Eklavya NEET 2027).
 * The sheets module is imported lazily so it never ships to the client bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AitsSchedule } from "./sheets.server";

type Ctx = { supabase: any; userId: string };

export type AitsResult = ({ ok: true } & AitsSchedule) | { ok: false; error: string };

export const getAitsSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AitsResult> => {
    const { supabase, userId } = context as Ctx;
    const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (error || !data) throw new Error("Access denied");
    try {
      const { fetchAitsSchedule } = await import("./sheets.server");
      const schedule = await fetchAitsSchedule();
      return { ok: true, ...schedule };
    } catch (e) {
      console.error("AITS sheet fetch failed:", e);
      return { ok: false, error: e instanceof Error ? e.message : "Sheet load nahi hui." };
    }
  });
