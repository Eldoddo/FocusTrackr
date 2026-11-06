import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchTasks, createTask, updateTask, deleteTask as removeTask,
} from '../services/taskService';

function showError(action, err) {
  console.error(`Failed to ${action}:`, err);
  Alert.alert(`Couldn't ${action}`, err?.message ?? String(err));
}

export default function TaskScreen() {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch((err) => showError('load tasks', err));
  }, []);

  const addTask = async () => {
    const name = input.trim();
    if (!name) return;
    setInput('');
    try {
      const saved = await createTask({ name, done: false });
      setTasks((prev) => [saved, ...prev]);
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
              <Text style={[styles.taskName, item.done && styles.taskNameDone]}>
                {item.name}
              </Text>

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
  taskNameDone: { textDecorationLine: 'line-through', color: '#B4B2C8' },
  deleteBtn: { fontSize: 14, color: '#B4B2C8', paddingHorizontal: 4 },
  sep: { height: 0.5, backgroundColor: '#E8E6F0', marginLeft: 52 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888799' },
});
