const LOGOS = ['🔔', '💧', '💊', '🏃', '📚', '🧘', '☕️', '💪', '⏰', '❤️', '⭐️', '🎯'];
let selectedLogo = '🔔';
let customLogoData = null;
let customSoundData = null;
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
    customLogoData = null;
    logoPreview.style.display = 'none';
  };
  grid.appendChild(d);
});
 
const logoInput = document.getElementById('logoUpload');
const logoPreview = document.getElementById('logoPreview');
logoInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    customLogoData = reader.result;
    selectedLogo = null;
    document.querySelectorAll('.logo-opt').forEach((el) => el.classList.remove('sel'));
    logoPreview.src = customLogoData;
    logoPreview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});
 
// ---------- Sound ----------
let audioCtx = null;
let customAudioEl = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function playSynth(kind) {
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
function playSound(kind) {
  if (!kind || kind === 'none' || kind === 'default') return;
  if (kind === 'custom' && customSoundData) {
    ensureAudio();
    if (!customAudioEl) customAudioEl = new Audio();
    customAudioEl.src = customSoundData;
    customAudioEl.currentTime = 0;
    customAudioEl.play().catch(() => {});
    return;
  }
  playSynth(kind);
}
 
const soundSelect = document.getElementById('sound');
const soundInput = document.getElementById('soundUpload');
const soundName = document.getElementById('soundName');
soundInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    customSoundData = reader.result;
    let opt = [...soundSelect.options].find((o) => o.value === 'custom');
    if (!opt) {
      opt = document.createElement('option');
      opt.value = 'custom';
      soundSelect.appendChild(opt);
    }
    opt.textContent = 'My sound: ' + file.name;
    soundSelect.value = 'custom';
    soundName.textContent = file.name;
    soundName.style.display = 'block';
  };
  reader.readAsDataURL(file);
});
document.getElementById('testSound').onclick = () => playSound(soundSelect.value);
 
function randomFireTimes(count, durationMs) {
  const now = Date.now();
  const minGap = Math.min(1000, durationMs / (count * 4));
  let offsets = [];
  for (let i = 0; i < count; i++) offsets.push(Math.random() * durationMs);
  offsets.sort((a, b) => a - b);
  for (let i = 1; i < offsets.length; i++) {
    if (offsets[i] - offsets[i - 1] < minGap) offsets[i] = offsets[i - 1] + minGap;
  }
  return offsets.filter((o) => o <= durationMs).map((o) => now + Math.round(o));
}
 
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    swReg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    return swReg;
  } catch (e) { console.warn('SW failed', e); return null; }
}
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'PLAY_SOUND') playSound(e.data.sound);
});
 
function updatePerm() {
  const pill = document.getElementById('permPill');
  const p = ('Notification' in window) ? Notification.permission : 'unsupported';
  pill.textContent = 'Notifications: ' + p;
  pill.className = 'pill ' + (p === 'granted' ? 'on' : 'off');
}
updatePerm();
 
function makeIcon() {
  if (customLogoData) return customLogoData;
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#16161d';
  ctx.fillRect(0, 0, 192, 192);
  ctx.font = '120px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(selectedLogo || '🔔', 96, 104);
  return c.toDataURL('image/png');
}
 
document.getElementById('startBtn').onclick = async () => {
  ensureAudio();
  if (!('Notification' in window)) {
    alert('This browser does not support notifications. On iPhone, add to Home Screen and open from there.');
    return;
  }
  let perm = Notification.permission;
  if (perm !== 'granted') perm = await Notification.requestPermission();
  updatePerm();
  if (perm !== 'granted') { alert('Notifications not granted. Enable them in iOS Settings.'); return; }
 
  await registerSW();
  if (!swReg) { alert('Could not start background scheduler.'); return; }
 
  const count = Math.max(1, parseInt(document.getElementById('count').value, 10) || 1);
  const dur = Math.max(1, parseInt(document.getElementById('dur').value, 10) || 1);
  const unit = parseInt(document.getElementById('durUnit').value, 10);
  const durationMs = dur * unit;
  const fireTimes = randomFireTimes(count, durationMs);
 
  swReg.active.postMessage({
    type: 'SCHEDULE', fireTimes,
    title: document.getElementById('title').value || 'Reminder',
    message: document.getElementById('message').value || '',
    icon: makeIcon(),
    sound: soundSelect.value
  });
 
  renderTimes(fireTimes);
  showToast(`Scheduled ${fireTimes.length} notifications over the next ${dur} ${unitLabel(unit)}.`);
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
  t.textContent = msg; t.style.opacity = '1';
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
registerSW();
