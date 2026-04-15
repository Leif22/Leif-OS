export type AreaListRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  task_count: number;
};

/** Einzelbereich (ohne Task-Count). */
export type AreaDetailArea = Pick<AreaListRow, "id" | "name" | "slug" | "description" | "sort_order">;

export type AreaDetailPerson = {
  id: string;
  first_name: string;
  last_name: string;
};

export type AreaDetailNote = {
  id: string;
  content: string;
  type: "note" | "draft";
  updated_at: string;
};
