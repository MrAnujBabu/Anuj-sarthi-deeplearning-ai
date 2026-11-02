import { buildTeacherMemory, type MemoryRow } from "./memory-rank";

export async function loadTeacherMemory(query: string): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("memory_items")
      .select("title,category,subject,chapter,content,kind,tracker_type,frequency,source_url")
      .eq("active", true)
      .limit(300);
    if (error) throw error;
    if (!data?.length) return "";
    return buildTeacherMemory(data as MemoryRow[], query);
  } catch (e) {
    console.error("teacher memory load failed", e);
    return "";
  }
}

export async function loadAgentBrain(): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("agent_settings").select("brain").eq("id", "main").maybeSingle();
    return (data?.brain ?? "").trim();
  } catch { return ""; }
}
