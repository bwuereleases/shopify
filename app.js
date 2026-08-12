const LOGOS = ['🔔', '💧', '💊', '🏃', '📚', '🧘', '☕️', '💪', '⏰', '❤️', '⭐️', '🎯'];
let selectedLogo = '🔔';
let swReg = null;

// ---------- Logo picker ----------
const grid = document.getElementById('logoGrid');
LOGOS.forEach((emoji, i) => {
  const d = document.createElement('div');
  d.className = 'logo-opt' + (i === 0 ? ' sel' : '');
  d.textContent = emoji;
  d.onclick = () => {
    document.querySelectorAll('.logo-opt').forEach((e) => e.classList.remove('sel'));
    d.classList.add('sel');
    selectedLogo = emoji;
  };
  grid.appendChild(d);
});

// ---------- Sound synthesis (Web Audio) ----------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function playSound(kind) {
  if (!kind || kind === 'none') return;
  ensureAudio();
  const t = audioCtx.currentTime;
  const notes = {
    beep: [[880, 0, 0.15]],
    chime: [[660, 0, 0.18], [880, 0.14, 0.22], [1320, 0.3, 0.3]],
    ping: [[1500, 0, 0.08], [1000, 0.06, 0.18]],
    alert: [[700, 0, 0.12], [700, 0.18, 0.12], [700, 0.36, 0.16]]
  }[kind] || [[880, 0, 0.15]];
  notes.forEach(([freq, start, dur]) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + start);
    gain.gain.exponentialRampToValueAtTime(0.35, t + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.05);
  });
}
document.getElementById('testSound').onclick = () => playSound(document.getElementById('sound').value);

// ---------- Random fire times ----------
// N random timestamps within [now, now+duration], with a small minimum gap so two
// don't land on the exact same instant. Purely random spacing otherwise.
function randomFireTimes(count, durationMs) {
  const now = Date.now();
  const minGap = Math.min(1000, durationMs / (count * 4)); // tiny separation
  let offsets = [];
  for (let i = 0; i < count; i++) offsets.push(Math.random() * durationMs);
  offsets.sort((a, b) => a - b);
  // enforce minimum gap
  for (let i = 1; i < offsets.length; i++) {
    if (offsets[i] - offsets[i - 1] < minGap) offsets[i] = offsets[i - 1] + minGap;
  }
  return offsets.filter((o) => o <= durationMs).map((o) => now + Math.round(o));
}

// ---------- Service worker ----------
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    swReg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    return swReg;
  } catch (e) {
    console.warn('SW failed', e);
    return null;
  }
}
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'PLAY_SOUND') playSound(e.data.sound);
});

// ---------- Permission + start ----------
function updatePerm() {
  const pill = document.getElementById('permPill');
  const p = ('Notification' in window) ? Notification.permission : 'unsupported';
  pill.textContent = 'Notifications: ' + p;
  pill.className = 'pill ' + (p === 'granted' ? 'on' : 'off');
}
updatePerm();

document.getElementById('startBtn').onclick = async () => {
  ensureAudio(); // unlock audio on user gesture

  if (!('Notification' in window)) {
    alert('This browser does not support notifications. On iPhone, add to Home Screen and open from there.');
    return;
  }
  let perm = Notification.permission;
  if (perm !== 'granted') perm = await Notification.requestPermission();
  updatePerm();
  if (perm !== 'granted') {
    alert('Notifications not granted. Enable them for this app in iOS Settings.');
    return;
  }

  await registerSW();
  if (!swReg) { alert('Could not start background scheduler.'); return; }

  const count = Math.max(1, parseInt(document.getElementById('count').value, 10) || 1);
  const dur = Math.max(1, parseInt(document.getElementById('dur').value, 10) || 1);
  const unit = parseInt(document.getElementById('durUnit').value, 10);
  const durationMs = dur * unit;

  const fireTimes = randomFireTimes(count, durationMs);

  swReg.active.postMessage({
    type: 'SCHEDULE',
    fireTimes,
    title: document.getElementById('title').value || 'Notification',
    message: document.getElementById('message').value || '',
    icon: makeIcon(selectedLogo),
    sound: document.getElementById('sound').value
  });

  renderTimes(fireTimes);
  const st = document.getElementById('status');
  st.querySelector('#permPill').className = 'pill on';
  showToast(`Scheduled ${fireTimes.length} notifications over the next ${dur} ${['','sec','min'][0] || ''}${unitLabel(unit)}.`);
};

document.getElementById('stopBtn').onclick = async () => {
  await registerSW();
  swReg?.active?.postMessage({ type: 'CANCEL' });
  document.getElementById('times').innerHTML = '';
  showToast('Stopped. No pending notifications.');
};

function unitLabel(u) { return u === 1000 ? 'sec' : u === 60000 ? 'min' : 'hr'; }

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;left:16px;right:16px;bottom:24px;background:#6c5ce7;color:#fff;padding:14px 16px;border-radius:14px;font-size:14px;text-align:center;z-index:99;box-shadow:0 8px 30px rgba(0,0,0,.4)';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; }, 3200);
}

function renderTimes(times) {
  const el = document.getElementById('times');
  el.innerHTML = '<label style="margin-bottom:8px;display:block">Upcoming (randomized):</label>';
  times.forEach((ts, i) => {
    const d = new Date(ts);
    const row = document.createElement('div');
    row.textContent = `#${i + 1}  ${d.toLocaleTimeString()}`;
    el.appendChild(row);
  });
}

// Build a data-URL PNG icon from the chosen emoji so notifications show your logo.
function makeIcon(emoji) {
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#16161d';
  ctx.fillRect(0, 0, 192, 192);
  ctx.font = '120px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 96, 104);
  return c.toDataURL('image/png');
}

registerSW();
