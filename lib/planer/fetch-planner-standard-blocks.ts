import type { SupabaseClient } from "@supabase/supabase-js";
import type { LegacyPlannerFrequency, PlannerRecurrenceRule } from "@/lib/planer/recurrence";
import { normalizeRecurrenceRule } from "@/lib/planer/recurrence";
import { DEFAULT_PLANNER_STANDARD_BLOCK_SEEDS } from "@/lib/planer/planner-standard-blocks-defaults";

export type PlannerStandardPaletteItem = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  priority: number;
  relevance: number;
  frequency?: LegacyPlannerFrequency;
  recurrenceRule?: PlannerRecurrenceRule;
  kind: "standard";
};

export type UserPlannerStandardBlockRow = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  priority: number;
  relevance: number;
  recurrence_rule: unknown;
  sort_order: number;
};

export function standardBlockRowToPaletteItem(row: UserPlannerStandardBlockRow): PlannerStandardPaletteItem | null {
  const rule = normalizeRecurrenceRule(row.recurrence_rule as PlannerRecurrenceRule | undefined, undefined);
  return {
    id: row.id,
    title: String(row.title ?? "").trim() || "Standardblock",
    description: row.description?.trim() ? row.description.trim() : undefined,
    durationMinutes: Math.max(15, Number(row.duration_minutes) || 45),
    priority: Math.min(3, Math.max(1, Math.floor(Number(row.priority) || 2))),
    relevance: Math.min(10, Math.max(1, Math.floor(Number(row.relevance) || 7))),
    recurrenceRule: rule,
    kind: "standard",
  };
}

async function ensureDefaultPlannerStandardBlocks(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("user_planner_standard_blocks")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (error) return;
  if ((data ?? []).length > 0) return;
  await supabase.from("user_planner_standard_blocks").insert(
    DEFAULT_PLANNER_STANDARD_BLOCK_SEEDS.map((row) => ({
      user_id: userId,
      title: row.title,
      description: row.description ?? null,
      duration_minutes: row.duration_minutes,
      priority: row.priority,
      relevance: row.relevance,
      recurrence_rule: row.recurrence_rule as unknown as Record<string, unknown>,
      sort_order: row.sort_order,
    })),
  );
}

export async function fetchPlannerStandardBlocksForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ blocks: PlannerStandardPaletteItem[]; error: string | null }> {
  await ensureDefaultPlannerStandardBlocks(supabase, userId);
  const { data, error } = await supabase
    .from("user_planner_standard_blocks")
    .select("id,title,description,duration_minutes,priority,relevance,recurrence_rule,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { blocks: [], error: error.message };
  const blocks: PlannerStandardPaletteItem[] = [];
  for (const raw of data ?? []) {
    const item = standardBlockRowToPaletteItem(raw as UserPlannerStandardBlockRow);
    if (item) blocks.push(item);
  }
  return { blocks, error: null };
}
