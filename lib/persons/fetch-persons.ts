import type { SupabaseClient } from "@supabase/supabase-js";
import type { AreaRow } from "@/lib/tasks/types";
import type { PersonRow, PersonWithAreas } from "./types";

export async function fetchPersonsPageData(supabase: SupabaseClient, userId: string): Promise<{
  persons: PersonWithAreas[];
  areas: AreaRow[];
  error: string | null;
}> {
  const [personsRes, areasRes] = await Promise.all([
    supabase
      .from("persons")
      .select("*")
      .eq("user_id", userId)
      .order("last_name")
      .order("first_name"),
    supabase.from("areas").select("id, name, sort_order").order("sort_order"),
  ]);

  if (personsRes.error) {
    return { persons: [], areas: [], error: personsRes.error.message };
  }
  if (areasRes.error) {
    return { persons: [], areas: [], error: areasRes.error.message };
  }

  const persons = (personsRes.data ?? []) as PersonRow[];
  const areas = (areasRes.data ?? []) as AreaRow[];
  const areaNameById = Object.fromEntries(areas.map((a) => [a.id, a.name]));

  const ids = persons.map((p) => p.id);
  const namesByPerson: Record<string, string[]> = {};
  const idsByPerson: Record<string, string[]> = {};
  if (ids.length > 0) {
    const { data: paRows, error: paErr } = await supabase
      .from("person_areas")
      .select("person_id, area_id")
      .in("person_id", ids);
    if (paErr) {
      return { persons: [], areas, error: paErr.message };
    }
    for (const row of paRows ?? []) {
      const pid = row.person_id as string;
      const aid = row.area_id as string;
      const nm = areaNameById[aid];
      idsByPerson[pid] ??= [];
      idsByPerson[pid].push(aid);
      if (nm) {
        namesByPerson[pid] ??= [];
        namesByPerson[pid].push(nm);
      }
    }
  }

  const merged: PersonWithAreas[] = persons.map((p) => ({
    ...p,
    category: p.category ?? null,
    address: p.address ?? null,
    birthday: p.birthday ?? null,
    birthday_outlook_event_id: p.birthday_outlook_event_id ?? null,
    area_ids: (idsByPerson[p.id] ?? []).slice(),
    area_names: (namesByPerson[p.id] ?? []).slice().sort((a, b) => a.localeCompare(b, "de")),
  }));

  return { persons: merged, areas, error: null };
}
