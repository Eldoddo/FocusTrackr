# AI Task Tracker — Setup Guide

## Project structure

```
src/
  services/
    geminiService.js    ← All AI logic (Gemini 2.0 Flash)
  screens/
    TaskScreen.jsx      ← Main task list UI
```

## 1. Create the Expo project

```bash
npx create-expo-app TaskTracker
cd TaskTracker
```

## 2. Copy the files

Copy `geminiService.js` → `src/services/geminiService.js`
Copy `TaskScreen.jsx`  → `src/screens/TaskScreen.jsx`

## 3. Get your free Gemini API key

1. Go to https://aistudio.google.com
2. Sign in with a Google account
3. Click "Get API key" → "Create API key"
4. Copy the key

Open `geminiService.js` and replace:
```js
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
```

## 4. Wire up the screen in App.js

```js
import TaskScreen from './src/screens/TaskScreen';

export default function App() {
  return <TaskScreen />;
}
```

## 5. Run the app

```bash
npx expo start
```
Scan the QR code with Expo Go on your Android device.

---

## AI features included

| Feature | Function | When it runs |
|---|---|---|
| Batch priority scoring | `batchScoreTasks()` | On app load |
| Single task scoring | `scoreTask()` | When a new task is added |
| Smart suggestions | `getSmartSuggestions()` | On load + pull-to-refresh |
| Task breakdown | `breakDownTask()` | When user taps "Break down" |
| Natural language dates | `parseNaturalDate()` | Optional — wire to date input |

## Free tier limits (Gemini 2.0 Flash)

- 1,500 requests / day
- 1,000,000 tokens / minute
- No credit card required

Batch scoring sends 1 request for all tasks — very quota-efficient.

## Going to the Play Store

1. `npx expo install expo-build-properties`
2. `eas build --platform android` (needs an Expo account)
3. Download the `.aab` file and upload to Google Play Console
