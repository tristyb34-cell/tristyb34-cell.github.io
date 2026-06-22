/* ============================================================
   DAX — notifications (best-effort nudges)
   Real background push needs a server; DAX has none by design.
   So this fires reminders when you OPEN the app and one is due,
   plus a live notification to prove permission works. Reliable
   coaching lives in-app (motivation.js); this is the cherry.
   ============================================================ */
import { db, settings } from './store.js';
import { getSchedule, toMinutes } from './schedule.js';
import { getDayLog } from './nutrition.js';
import { VAPID_PUBLIC_KEY } from './data.js';

export function supported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}
export function pushSupported() {
  return supported() && 'PushManager' in window;
}
export function permission() {
  return supported() ? Notification.permission : 'unsupported';
}

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// subscribe this device to push (idempotent — returns the existing sub if present)
export async function subscribePush() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  return sub;
}

// the subscription as JSON, for the one-time handoff to the cron sender
export async function getPushSubscriptionJSON() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? JSON.stringify(sub) : null;
}

export async function enable() {
  if (!supported()) return 'unsupported';
  const p = await Notification.requestPermission();
  if (p === 'granted') {
    await settings.set('notify', true);
    try { await subscribePush(); } catch (e) { /* push is a bonus; open-app fallback still works */ }
    await notify('DAX is watching 👀', 'Your coach is on. I’ll nudge you to train and to eat. Now go build.');
  }
  return p;
}

export async function disable() { await settings.set('notify', false); }

export async function notify(title, body) {
  if (permission() !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      tag: 'dax',
    });
    return true;
  } catch (e) {
    try { new Notification(title, { body }); return true; } catch (_) { return false; }
  }
}

/* fire any scheduled reminder that's due when the app opens (open-app fallback) */
export async function fireDueReminders(ctx) {
  const on = await settings.get('notify', false);
  if (!on || permission() !== 'granted') return;

  const nowMin = ctx.now.getHours() * 60 + ctx.now.getMinutes();
  const date = ctx.now.toISOString().slice(0, 10);
  const sentMap = (await db.get('notif_sent', {})) || {};
  const sent = new Set(sentMap[date] || []);
  const mark = async (key) => { sent.add(key); sentMap[date] = [...sent]; await db.set('notif_sent', sentMap); };

  const schedule = await getSchedule(ctx.now);
  const foodLog = await getDayLog(date);

  for (const item of schedule) {
    if (!item.enabled || sent.has(item.id)) continue;
    if (nowMin < toMinutes(item.time)) continue;          // not time yet
    if (nowMin - toMinutes(item.time) > 180) { await mark(item.id); continue; } // too late, skip silently

    if (item.kind === 'meal') {
      if (foodLog[item.mealId]) { await mark(item.id); continue; } // already eaten
      await notify(`${item.label} ⏰`, item.body);
      await mark(item.id);
    } else if (item.kind === 'train') {
      if (!ctx.isTrainingDay) { await mark(item.id); continue; }   // rest day
      if (ctx.trainedToday) { await mark(item.id); continue; }
      await notify(`${ctx.dayTitle || 'Train'} 🔥`, item.body);
      await mark(item.id);
    } else if (item.kind === 'shake') {
      if (!ctx.isTrainingDay) { await mark(item.id); continue; } // rest day, no shake
      if (!ctx.trainedToday) continue;                          // wait until the session's logged
      await notify(item.label, item.body);
      await mark(item.id);
    }
  }
}

export async function reminderSettings() {
  return { on: await settings.get('notify', false), perm: permission() };
}
