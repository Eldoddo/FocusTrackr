import { supabase } from '../lib/supabase';

// ── Mappers ───────────────────────────────────────────────────

export function mapFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    done: row.done,
    doneAt: row.done_at,
    createdAt: row.created_at,
  };
}

function mapToDb(task) {
  const row = {};
  if (task.name              !== undefined) row.name              = task.name;
  if (task.done              !== undefined) row.done              = task.done;
  if (task.doneAt            !== undefined) row.done_at           = task.doneAt;
  return row;
}

// ── Fetch ─────────────────────────────────────────────────────

export async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks_db')
    .select(`*, categories(name, colour, icon), subcategories(name)`)
    .order('done', { ascending: true })
    .order('score', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data.map(mapFromDb);
}



// ── CRUD ──────────────────────────────────────────────────────

export async function createTask(task) {
  const { data, error } = await supabase
    .from('tasks_db')
    .insert([mapToDb(task)])
    .single();
  if (error) throw error;
  return mapFromDb(data);
}

export async function updateTask(id, changes) {
  const { data, error } = await supabase
    .from('tasks_db')
    .update(mapToDb(changes))
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapFromDb(data);
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks_db').delete().eq('id', id);
  if (error) throw error;
}


