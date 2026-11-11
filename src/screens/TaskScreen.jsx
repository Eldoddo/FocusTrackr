import { SafeAreaView } from 'react-native-safe-area-context';
import {fetchTasks, createTask, updateTask, deleteTask as removeTask,} from '../services/taskService';
import {fetchCategories, createCategory, createSubcategory,} from '../services/categoryService';
import CategoryPicker from '../components/CategoryPicker';


function showError(action, err) {
  console.error(`Failed to ${action}:`, err);
  Alert.alert(`Couldn't ${action}`, err?.message ?? String(err));
}

export default function TaskScreen() {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [subcategoryId, setSubcategoryId] = useState(null);

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch((err) => showError('load tasks', err));
      fetchCategories()
      .then(setCategories)
      .catch((err) => showError('load categories', err));
  }, []);

  const addTask = async () => {
    const name = input.trim();
    if (!name) return;
    setInput('');
    try {
      const saved = await createTask({ name, done: false, categoryId, subcategoryId});
      setTasks((prev) => [saved, ...prev]);
      setCategoryId(null);
      setSubcategoryId(null);
    } catch (err) {
      setInput(name);
      showError('save task', err);
    }
  };

  const toggleTask = async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const done = !task.done;
    try {
      const saved = await updateTask(id, {
        done,
        doneAt: done ? new Date().toISOString() : null,
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? saved : t)));
    } catch (err) {
      showError('update task', err);
    }
  };

  const deleteTask = async (id) => {
    try {
      await removeTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      showError('delete task', err);
    }
  };

  const selectCategory = (id) => {
    setCategoryId((current) => (current === id ? null : id));
    setSubcategoryId(null);
  };

  const selectSubcategory = (id) => {
    setSubcategoryId((current) => (current === id ? null : id));
  };

  const addCategory = async (name) => {
    try {
      const saved = await createCategory(name);
      setCategories((prev) =>
        [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCategoryId(saved.id);
      setSubcategoryId(null);
    } catch (err) {
      showError('create category', err);
    }
  };

  const addSubcategory = async (name) => {
    if (!categoryId) return;
    try {
      const saved = await createSubcategory(categoryId, name);
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? { ...c, subcategories: [...c.subcategories, saved] }
            : c
        )
      );
      setSubcategoryId(saved.id);
    } catch (err) {
      showError('create subcategory', err);
    }
  };

  const labelFor = (task) => {
    const category = categories.find((c) => c.id === task.categoryId);
    if (!category) return null;
    const sub = category.subcategories.find((s) => s.id === task.subcategoryId);
    return sub ? `${category.name} › ${sub.name}` : category.name;
  };
 
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Tasks</Text>
          <Text style={styles.count}>{open.length} remaining</Text>
        </View>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add a task…"
            placeholderTextColor="#B4B2C8"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={addTask}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addTask}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        {/* Category picker */}
        <CategoryPicker
          categories={categories}
          categoryId={categoryId}
          subcategoryId={subcategoryId}
          onSelectCategory={selectCategory}
          onSelectSubcategory={selectSubcategory}
          onCreateCategory={addCategory}
          onCreateSubcategory={addSubcategory}
        />
        {/* Task list */}
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyText}>No tasks yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.taskRow}>
              {/* Checkbox */}
              <TouchableOpacity
                style={[styles.check, item.done && styles.checkDone]}
                onPress={() => toggleTask(item.id)}
              >
                {item.done && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>

              {/* Name */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskName, item.done && styles.taskNameDone]}>
                  {item.name}
                </Text>
                {labelFor(item) && (
                  <Text style={styles.taskLabel}>{labelFor(item)}</Text>
                )}
              </View>

              {/* Delete */}
              <TouchableOpacity onPress={() => deleteTask(item.id)}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1825' },
  count: { fontSize: 13, color: '#888799', marginTop: 2 },
  inputRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  input: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 0.5, borderColor: '#E8E6F0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1825' },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#534AB7', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 28, color: '#fff', lineHeight: 32 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E6F0', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  taskName: { flex: 1, fontSize: 15, color: '#1A1825' },
  taskLabel: { fontSize: 12, color: '#888799', marginTop: 2 },
  taskNameDone: { textDecorationLine: 'line-through', color: '#B4B2C8' },
  deleteBtn: { fontSize: 14, color: '#B4B2C8', paddingHorizontal: 4 },
  sep: { height: 0.5, backgroundColor: '#E8E6F0', marginLeft: 52 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888799' },
});
