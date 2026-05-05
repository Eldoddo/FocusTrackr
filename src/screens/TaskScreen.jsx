// ============================================================
// TaskScreen.jsx — Main screen for the AI Task Tracker app
// React Native + Expo
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, RefreshControl, Animated,
} from 'react-native';
import geminiService from '../services/geminiService';

// ── Colour tokens ─────────────────────────────────────────────
const C = {
  purple: '#534AB7',
  purpleLight: '#EEEDFE',
  purpleMid: '#AFA9EC',
  teal: '#1D9E75',
  tealLight: '#E1F5EE',
  red: '#E24B4A',
  amber: '#EF9F27',
  bg: '#F8F7FF',
  surface: '#FFFFFF',
  border: '#E8E6F0',
  text: '#1A1825',
  muted: '#888799',
  hint: '#B4B2C8',
};

const TAG_STYLES = {
  personal: { bg: C.purpleLight, text: '#3C3489' },
  work:     { bg: C.tealLight,   text: '#085041' },
  health:   { bg: '#FAECE7',     text: '#712B13' },
};

const PRIORITY_COLOURS = { high: C.red, med: C.amber, low: C.teal };

// ── Seed data ─────────────────────────────────────────────────
const INITIAL_TASKS = [
  { id: '1', name: 'Review project proposal', tag: 'work',     dueDate: 'Today', score: null, priority: null, done: false, notes: '' },
  { id: '2', name: 'Buy groceries',           tag: 'personal', dueDate: 'Today', score: null, priority: null, done: false, notes: '' },
  { id: '3', name: 'Morning run',             tag: 'health',   dueDate: 'Today', score: null, priority: null, done: true,  notes: '' },
  { id: '4', name: 'Call mum',                tag: 'personal', dueDate: 'Today', score: null, priority: null, done: false, notes: '' },
];

// ── Sub-components ────────────────────────────────────────────

function PriorityBadge({ score, priority }) {
  if (score === null) return <ActivityIndicator size="small" color={C.purple} />;
  return (
    <View style={[styles.scorePill, { backgroundColor: C.purpleLight }]}>
      <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOURS[priority] ?? C.hint }]} />
      <Text style={styles.scoreText}>{score}</Text>
    </View>
  );
}

function TagChip({ tag }) {
  const s = TAG_STYLES[tag] ?? TAG_STYLES.personal;
  return (
    <View style={[styles.tag, { backgroundColor: s.bg }]}>
      <Text style={[styles.tagText, { color: s.text }]}>{tag}</Text>
    </View>
  );
}

function SuggestionCard({ suggestion, onAdd }) {
  return (
    <View style={styles.suggestionCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.suggestionText}>{suggestion.text}</Text>
        <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
      </View>
      <TouchableOpacity style={styles.suggestionBtn} onPress={() => onAdd(suggestion)}>
        <Text style={styles.suggestionBtnText}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );
}

function TaskItem({ task, onToggle, onBreakDown }) {
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1,   duration: 100, useNativeDriver: true }),
    ]).start(() => onToggle(task.id));
  };

  return (
    <Animated.View style={[styles.taskItem, { opacity: fadeAnim }]}>
      <TouchableOpacity style={styles.checkBtn} onPress={handleToggle} accessibilityRole="checkbox">
        <View style={[styles.check, task.done && styles.checkDone]}>
          {task.done && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={[styles.taskName, task.done && styles.taskNameDone]} numberOfLines={2}>
          {task.name}
        </Text>
        <View style={styles.taskMeta}>
          <TagChip tag={task.tag} />
          {task.dueDate ? <Text style={styles.dueDate}>{task.dueDate}</Text> : null}
          {!task.done && (
            <TouchableOpacity onPress={() => onBreakDown(task)}>
              <Text style={styles.breakdownLink}>Break down</Text>
            </TouchableOpacity>
          )}
        </View>
        {task.scoreReason ? (
          <Text style={styles.scoreReason}>{task.scoreReason}</Text>
        ) : null}
      </View>

      {!task.done && <PriorityBadge score={task.score} priority={task.priority} />}
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────

export default function TaskScreen() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [suggestions, setSuggestions] = useState([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedTag, setSelectedTag] = useState('personal');
  const [showAdd, setShowAdd] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scoringAll, setScoringAll] = useState(false);

  // Score all tasks on mount
  useEffect(() => {
    scoreAllTasks();
    fetchSuggestions();
  }, []);

  const scoreAllTasks = useCallback(async () => {
    setScoringAll(true);
    try {
      const scored = await geminiService.batchScoreTasks(INITIAL_TASKS);
      setTasks(scored);
    } catch (e) {
      console.warn('Batch scoring failed:', e);
    } finally {
      setScoringAll(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const completedToday = tasks.filter((t) => t.done);
      const result = await geminiService.getSmartSuggestions(tasks, completedToday);
      setSuggestions(result);
    } catch (e) {
      console.warn('Suggestions failed:', e);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [tasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([scoreAllTasks(), fetchSuggestions()]);
    setRefreshing(false);
  }, []);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const addTask = async () => {
    if (!newTaskName.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      name: newTaskName.trim(),
      tag: selectedTag,
      dueDate: 'Today',
      score: null,
      priority: null,
      done: false,
      notes: '',
    };
    setTasks((prev) => [newTask, ...prev]);
    setNewTaskName('');
    setShowAdd(false);

    // Score in background
    try {
      const result = await geminiService.scoreTask(newTask);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === newTask.id
            ? { ...t, score: result.score, priority: result.priority, scoreReason: result.reason }
            : t
        )
      );
    } catch (e) {
      console.warn('Scoring failed:', e);
    }
  };

  const addSuggested = async (suggestion) => {
    setSuggestions((prev) => prev.filter((s) => s.text !== suggestion.text));
    const newTask = {
      id: Date.now().toString(),
      name: suggestion.text,
      tag: suggestion.tag,
      dueDate: 'Today',
      score: null,
      priority: null,
      done: false,
      notes: '',
    };
    setTasks((prev) => [newTask, ...prev]);
    try {
      const result = await geminiService.scoreTask(newTask);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === newTask.id
            ? { ...t, score: result.score, priority: result.priority, scoreReason: result.reason }
            : t
        )
      );
    } catch {}
  };

  const breakDownTask = async (task) => {
    Alert.alert('Breaking down task…', 'Gemini is generating subtasks.');
    try {
      const subtasks = await geminiService.breakDownTask(task);
      if (!subtasks.length) {
        Alert.alert('No subtasks generated', 'Try adding more detail to the task.');
        return;
      }
      // Score subtasks then insert them below the parent
      const scored = await geminiService.batchScoreTasks(subtasks);
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === task.id);
        const next = [...prev];
        next.splice(idx + 1, 0, ...scored);
        return next;
      });
    } catch (e) {
      Alert.alert('Error', 'Could not break down task. Check your API key.');
    }
  };

  // Sorted: incomplete high-score first, done at bottom
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (b.score ?? 0) - (a.score ?? 0);
  });

  const done = tasks.filter((t) => t.done).length;
  const avgScore =
    tasks.filter((t) => !t.done && t.score !== null).length
      ? Math.round(
          tasks.filter((t) => !t.done && t.score !== null).reduce((s, t) => s + t.score, 0) /
            tasks.filter((t) => !t.done && t.score !== null).length
        )
      : '—';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.headerTitle}>My tasks</Text>
        </View>
        <TouchableOpacity style={styles.fab} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.fabIcon}>{showAdd ? '×' : '+'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{tasks.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{done}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: C.purple }]}>{avgScore}</Text>
          <Text style={styles.statLabel}>Avg score</Text>
        </View>
      </View>

      <FlatList
        data={sortedTasks}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            {/* Add task form */}
            {showAdd && (
              <View style={styles.addForm}>
                <TextInput
                  style={styles.input}
                  placeholder="What do you need to do?"
                  placeholderTextColor={C.hint}
                  value={newTaskName}
                  onChangeText={setNewTaskName}
                  onSubmitEditing={addTask}
                  returnKeyType="done"
                  autoFocus
                />
                <View style={styles.tagRow}>
                  {['personal', 'work', 'health'].map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagBtn, selectedTag === tag && styles.tagBtnActive]}
                      onPress={() => setSelectedTag(tag)}
                    >
                      <Text style={[styles.tagBtnText, selectedTag === tag && styles.tagBtnTextActive]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addBtn} onPress={addTask}>
                    <Text style={styles.addBtnText}>Add task</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.aiDot} />
                  <Text style={styles.sectionTitle}>AI suggestions</Text>
                  {loadingSuggestions && <ActivityIndicator size="small" color={C.purple} style={{ marginLeft: 8 }} />}
                </View>
                {suggestions.map((s, i) => (
                  <SuggestionCard key={i} suggestion={s} onAdd={addSuggested} />
                ))}
              </View>
            )}

            {/* Tasks heading */}
            <View style={[styles.sectionHeader, { paddingHorizontal: 16, marginBottom: 4 }]}>
              <Text style={styles.sectionTitle}>Today's tasks</Text>
              <Text style={styles.sortLabel}>sorted by priority score</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TaskItem task={item} onToggle={toggleTask} onBreakDown={breakDownTask} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    backgroundColor: C.surface, borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  greeting: { fontSize: 12, color: C.muted },
  headerTitle: { fontSize: 22, fontWeight: '600', color: C.text, marginTop: 2 },
  fab: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  fabIcon: { fontSize: 24, color: '#fff', lineHeight: 28 },

  statsRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface,
  },
  statCard: {
    flex: 1, backgroundColor: C.bg, borderRadius: 10,
    padding: 10, alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '600', color: C.text },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2 },

  addForm: {
    margin: 16, padding: 16, backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 0.5, borderColor: C.border,
  },
  input: {
    fontSize: 15, color: C.text, borderBottomWidth: 0.5,
    borderBottomColor: C.border, paddingVertical: 8, marginBottom: 12,
  },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tagBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bg,
  },
  tagBtnActive: { backgroundColor: C.purpleLight, borderColor: C.purpleMid },
  tagBtnText: { fontSize: 12, color: C.muted },
  tagBtnTextActive: { color: '#3C3489', fontWeight: '500' },
  formActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bg,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: C.muted },
  addBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.purple, alignItems: 'center',
  },
  addBtnText: { fontSize: 14, color: '#fff', fontWeight: '500' },

  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sortLabel: { fontSize: 11, color: C.hint, marginLeft: 'auto' },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple },

  suggestionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.purpleLight,
    borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 0.5, borderColor: C.purpleMid,
  },
  suggestionText: { fontSize: 13, color: '#3C3489', fontWeight: '500' },
  suggestionReason: { fontSize: 11, color: '#534AB7', marginTop: 2 },
  suggestionBtn: {
    borderWidth: 0.5, borderColor: C.purpleMid, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginLeft: 10,
  },
  suggestionBtnText: { fontSize: 12, color: C.purple, fontWeight: '500' },

  taskItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface,
  },
  checkBtn: { paddingTop: 2 },
  check: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkDone: { backgroundColor: C.teal, borderColor: C.teal },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  taskName: { fontSize: 14, color: C.text, lineHeight: 20 },
  taskNameDone: { textDecorationLine: 'line-through', color: C.hint },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  tagText: { fontSize: 10, fontWeight: '500' },
  dueDate: { fontSize: 10, color: C.hint },
  breakdownLink: { fontSize: 10, color: C.purple, textDecorationLine: 'underline' },
  scoreReason: { fontSize: 10, color: C.muted, marginTop: 3, fontStyle: 'italic' },
  scorePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  scoreText: { fontSize: 11, fontWeight: '600', color: '#3C3489' },
  separator: { height: 0.5, backgroundColor: C.border, marginLeft: 50 },
});
