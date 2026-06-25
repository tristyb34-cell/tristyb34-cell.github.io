/* ============================================================
   DAX — Journal / check-in log
   A place to talk or type how training and the body feel. Voice
   works through the iPhone keyboard's own mic key (dictation),
   so it's just an editable text box — no speech engine, no server.
   Smart prompts: only after a training day, spaced out (never every
   session), and the leg/quad gets asked often while it's being watched.
   ============================================================ */
import { db } from './store.js';

const dkey = (d = new Date()) => d.toISOString().slice(0, 10);
const epochDay = (d = new Date()) => Math.floor(d.getTime() / 86400000);

export const TAGS = ['Training', 'Leg', 'Energy', 'Recovery', 'Sleep', 'Mind', 'Win'];
export const QUAD_FEELS = [
  { id: 'fine', label: 'Fine', emoji: '✅' },
  { id: 'niggle', label: 'Niggle', emoji: '⚠️' },
  { id: 'worse', label: 'Worse', emoji: '🔻' },
];

// Varied check-in questions. Leg-weighted on purpose while the quad is on trial.
const QUESTIONS = [
  { kind: 'leg', text: 'How was training today? Did your leg feel strange or pulled, or was it quiet?' },
  { kind: 'general', text: 'How was training, did it flow, or feel off?' },
  { kind: 'leg', text: 'Quick leg check: any of that thigh pain creeping in under load, or fine?' },
  { kind: 'recovery', text: "How's the body today, energy, soreness, sleep?" },
  { kind: 'leg', text: 'Be honest about the quad, how did it hold up in the session?' },
  { kind: 'mind', text: 'How are you feeling about the process right now? Be real.' },
];
const LEG_QUESTIONS = QUESTIONS.filter(q => q.kind === 'leg');

function chooseQuestion(now, lastSession) {
  const legDay = lastSession && (/leg/i.test(lastSession.title || '') || lastSession.dow === 'Fri');
  if (legDay) return LEG_QUESTIONS[epochDay(now) % LEG_QUESTIONS.length];
  return QUESTIONS[epochDay(now) % QUESTIONS.length];
}

/* ---------- entries ---------- */
export async function getEntries() {
  return (await db.get('journal', [])) || [];
}

export async function addEntry({ text, tags = [], quad = null }) {
  const now = new Date();
  const entry = { id: now.getTime(), date: dkey(now), ts: now.toISOString(), text: (text || '').trim(), tags, quad };
  if (!entry.text && !quad) return null; // nothing to save
  const all = await getEntries();
  all.push(entry);
  await db.set('journal', all);
  await db.set('journalPromptLast', dkey(now)); // logging starts the cooldown
  return entry;
}

export async function deleteEntry(id) {
  const all = await getEntries();
  await db.set('journal', all.filter(e => e.id !== id));
}

/* ---------- the smart prompt ---------- */
// Returns {kind, text} to ask today, or null. Pure read (no side effects),
// so Today and the Journal tab show the SAME question on the same day.
export async function journalPrompt(now = new Date()) {
  const entries = await getEntries();
  if (entries.some(e => e.date === dkey(now))) return null; // already journaled today
  const sessions = (await db.get('sessions', [])) || [];
  if (!sessions.length) return null;
  const last = sessions[sessions.length - 1];
  const sinceTrain = Math.floor((now - new Date(last.date + 'T00:00:00')) / 86400000);
  if (sinceTrain > 1) return null; // only right after a training day
  const lastPrompt = await db.get('journalPromptLast', null);
  if (lastPrompt) {
    const gap = Math.floor((now - new Date(lastPrompt + 'T00:00:00')) / 86400000);
    if (gap >= 1 && gap < 3) return null; // 3-day cooldown (gap 0 = still today, keep showing)
  }
  return chooseQuestion(now, last);
}

// Called by Today after it renders the nudge, so the cooldown clock starts
// even if he ignores it (keeps it from showing every single session).
export async function markJournalPrompted(now = new Date()) {
  await db.set('journalPromptLast', dkey(now));
}
