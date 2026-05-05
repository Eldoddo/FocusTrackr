// ============================================================
// geminiService.js — AI integration layer for TaskTracker
// Uses Gemini 2.0 Flash (free tier: 1,500 req/day)
// Get your free API key at: https://aistudio.google.com
// ============================================================

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your key
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ── Utility ──────────────────────────────────────────────────

async function callGemini(prompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 512,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return raw.replace(/```json|```/g, '').trim();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

// ── 1. Priority Scoring ───────────────────────────────────────
// Scores a single task 0–100 and returns a short reason.
// Called when a task is created or edited.

export async function scoreTask({ name, tag, dueDate, notes = '' }) {
  const today = new Date().toDateString();

  const prompt = `
You are a personal productivity assistant. Score this task for priority (0-100).

Task: "${name}"
Category: ${tag}
Due: ${dueDate || 'not set'}
Notes: ${notes || 'none'}
Today: ${today}

Scoring guide:
- 80-100: Urgent AND important (deadline today/tomorrow, high impact)
- 60-79: Important but not urgent, or urgent but low impact
- 40-59: Nice to do, no clear deadline
- 0-39: Low priority, can wait

Respond ONLY with valid JSON, no extra text:
{"score": <number 0-100>, "priority": "<high|med|low>", "reason": "<one sentence why>"}
`;

  try {
    const json = await callGemini(prompt);
    const parsed = JSON.parse(json);
    return {
      score: Math.min(100, Math.max(0, Math.round(parsed.score))),
      priority: parsed.priority ?? derivePriority(parsed.score),
      reason: parsed.reason ?? '',
    };
  } catch {
    // Fallback to local heuristic if API fails
    return localScoreTask({ name, tag, dueDate });
  }
}

// ── 2. Batch Scoring ──────────────────────────────────────────
// Scores multiple tasks in one API call (saves quota).
// Use this on app load to score all unscored tasks.

export async function batchScoreTasks(tasks) {
  if (!tasks.length) return [];

  const taskList = tasks
    .map(
      (t, i) =>
        `${i + 1}. name: "${t.name}", category: ${t.tag}, due: ${t.dueDate || 'not set'}`
    )
    .join('\n');

  const prompt = `
You are a personal productivity assistant. Score each task for priority (0-100).

Tasks:
${taskList}

Today: ${new Date().toDateString()}

Scoring guide:
- 80-100: Urgent AND important
- 60-79: Important or urgent
- 40-59: Normal priority
- 0-39: Low priority

Respond ONLY with a valid JSON array, one object per task, in the same order:
[{"score": 85, "priority": "high", "reason": "..."}, ...]
`;

  try {
    const json = await callGemini(prompt);
    const parsed = JSON.parse(json);
    return tasks.map((task, i) => ({
      ...task,
      score: Math.min(100, Math.max(0, Math.round(parsed[i]?.score ?? 50))),
      priority: parsed[i]?.priority ?? derivePriority(parsed[i]?.score ?? 50),
      scoreReason: parsed[i]?.reason ?? '',
    }));
  } catch {
    // Fallback: score each task locally
    return tasks.map((task) => ({ ...task, ...localScoreTask(task) }));
  }
}

// ── 3. Smart Suggestions ──────────────────────────────────────
// Analyses the user's task list and returns 1-3 suggestions
// for tasks they might be missing or should prioritise.

export async function getSmartSuggestions(tasks, completedToday = []) {
  const openTasks = tasks.filter((t) => !t.done);
  const tags = [...new Set(openTasks.map((t) => t.tag))];

  const taskSummary = openTasks
    .slice(0, 15) // cap to keep prompt short
    .map((t) => `- "${t.name}" (${t.tag}, score ${t.score})`)
    .join('\n');

  const doneSummary = completedToday
    .slice(0, 5)
    .map((t) => `- "${t.name}"`)
    .join('\n');

  const prompt = `
You are a smart personal productivity assistant. Analyse this person's task list and suggest 2-3 tasks they might be missing or should do today.

Current open tasks:
${taskSummary || 'None'}

Completed today:
${doneSummary || 'None'}

Active categories: ${tags.join(', ')}

Rules:
- Be specific and actionable, not vague
- Don't suggest tasks already in the list
- Focus on common self-care, health, or productivity habits they may be skipping
- Keep suggestions short (max 6 words each)

Respond ONLY with valid JSON, no extra text:
{"suggestions": [{"text": "...", "tag": "<personal|work|health>", "reason": "..."}, ...]}
`;

  try {
    const json = await callGemini(prompt);
    const parsed = JSON.parse(json);
    return (parsed.suggestions ?? []).slice(0, 3);
  } catch {
    return getDefaultSuggestions(tags);
  }
}

// ── 4. Task Breakdown ─────────────────────────────────────────
// Takes a big/vague task and breaks it into smaller subtasks.
// Great UX: user taps "Break this down" on any task card.

export async function breakDownTask(task) {
  const prompt = `
Break this task into 3-5 smaller, actionable subtasks.

Task: "${task.name}"
Category: ${task.tag}
Notes: ${task.notes || 'none'}

Respond ONLY with valid JSON:
{"subtasks": ["...", "...", "..."]}
`;

  try {
    const json = await callGemini(prompt);
    const parsed = JSON.parse(json);
    return (parsed.subtasks ?? []).map((name, i) => ({
      id: `${task.id}-sub-${i}`,
      name,
      tag: task.tag,
      parentId: task.id,
      done: false,
    }));
  } catch {
    return [];
  }
}

// ── 5. Natural Language Date Parser ──────────────────────────
// Converts strings like "next Friday" or "end of week" to ISO dates.

export async function parseNaturalDate(input) {
  const today = new Date();
  const prompt = `
Convert this natural language date to an ISO 8601 date string (YYYY-MM-DD).
Today is ${today.toISOString().split('T')[0]}.
Input: "${input}"
Respond ONLY with the date string, nothing else. Example: 2025-05-15
`;

  try {
    const result = await callGemini(prompt);
    const match = result.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

// ── Local Fallbacks ───────────────────────────────────────────
// Used when the API is unavailable (offline, quota exceeded, etc.)

function localScoreTask({ name, tag, dueDate }) {
  const urgencyWords = [
    'urgent', 'asap', 'today', 'deadline', 'call', 'review',
    'submit', 'finish', 'complete', 'pay', 'send', 'fix',
  ];
  const nameLower = name.toLowerCase();
  const hasUrgency = urgencyWords.some((w) => nameLower.includes(w));
  const isDueToday =
    dueDate && new Date(dueDate).toDateString() === new Date().toDateString();

  const tagScore = tag === 'work' ? 20 : tag === 'health' ? 15 : 10;
  const score = Math.min(
    99,
    40 + tagScore + (hasUrgency ? 20 : 0) + (isDueToday ? 15 : 0)
  );

  return { score, priority: derivePriority(score), reason: 'Scored offline' };
}

function derivePriority(score) {
  if (score >= 80) return 'high';
  if (score >= 55) return 'med';
  return 'low';
}

function getDefaultSuggestions(activeTags) {
  const pool = [
    { text: 'Drink 8 glasses of water', tag: 'health', reason: 'Hydration is often forgotten' },
    { text: 'Plan tomorrow morning', tag: 'personal', reason: 'Sets you up for a good day' },
    { text: 'Check unread emails', tag: 'work', reason: 'Clear your inbox backlog' },
    { text: '10-minute stretch break', tag: 'health', reason: 'Good for desk workers' },
    { text: 'Review weekly goals', tag: 'personal', reason: 'Stay on track' },
  ];
  return pool.filter((s) => activeTags.includes(s.tag)).slice(0, 2);
}

// ── Export all ────────────────────────────────────────────────
export default {
  scoreTask,
  batchScoreTasks,
  getSmartSuggestions,
  breakDownTask,
  parseNaturalDate,
};
