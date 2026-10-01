import type { SupabaseClient } from "@supabase/supabase-js";

import { STARTER_CODE } from "~/components/studio/sample-component";

export type ComponentRow = {
  id: string;
  project_name: string;
  name: string;
  objects: unknown;
  version: number;
  updated_at: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  status: string;
  /** Where it is edited: on the canvas, or in the code editor. */
  editor: "canvas" | "code";
};

export type ComponentSummary = Pick<ComponentRow, "id" | "name" | "project_name" | "updated_at" | "status">;

// Row-level security limits every query to the signed-in user's own components.
export async function listComponents(supabase: SupabaseClient): Promise<ComponentSummary[]> {
  const { data, error } = await supabase
    .from("components")
    .select("id, name, project_name, updated_at, status")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getComponent(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("components").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ComponentRow | null;
}

export type Editor = ComponentRow["editor"];
export const parseEditor = (v: unknown): Editor | null => (v === "canvas" || v === "code" ? v : null);

/** A new, empty draft. In the code editor it starts with one component holding a small starter. */
export async function createComponent(supabase: SupabaseClient, editor: Editor = "canvas") {
  const row: Record<string, unknown> =
    editor === "code"
      ? {
          editor,
          objects: [{ id: crypto.randomUUID(), kind: "component", name: "Component", x: 0, y: 0, width: 480, height: 320, code: STARTER_CODE }],
        }
      : { editor };
  const { data, error } = await supabase.from("components").insert(row).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export type DeleteResult = { ok: true } | { ok: false; message: string };

/** Deletes one of the person's own components, draft or published, with its versions and feedback. */
export async function deleteComponent(supabase: SupabaseClient, id: string): Promise<DeleteResult> {
  const { error } = await supabase.rpc("delete_component", { p_id: id });
  if (!error) return { ok: true };
  if (/not_allowed/.test(error.message)) return { ok: false, message: "That component can't be deleted. It may already be gone." };
  return { ok: false, message: "That component couldn't be deleted. Try again." };
}
