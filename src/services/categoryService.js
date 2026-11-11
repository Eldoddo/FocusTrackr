import { supabase } from '../lib/supabase';

// ── Mappers ───────────────────────────────────────────────────

function mapSubcategory(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
  };
}

function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    colour: row.colour,
    subcategories: (row.subcategories ?? []).map(mapSubcategory),
  };
}

// ── Fetch ─────────────────────────────────────────────────────

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, colour, subcategories(id, category_id, name)')
    .order('name')
    .order('name', { referencedTable: 'subcategories' });
  if (error) throw error;
  return data.map(mapCategory);
}

// ── Create ────────────────────────────────────────────────────

export async function createCategory(name) {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name }])
    .select('id, name, colour')
    .single();
  if (error) throw error;
  return mapCategory(data);
}

export async function createSubcategory(categoryId, name) {
  const { data, error } = await supabase
    .from('subcategories')
    .insert([{ category_id: categoryId, name }])
    .select('id, category_id, name')
    .single();
  if (error) throw error;
  return mapSubcategory(data);
}

// ── Delete ────────────────────────────────────────────────────

export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteSubcategory(id) {
  const { error } = await supabase.from('subcategories').delete().eq('id', id);
  if (error) throw error;
}