// Bleed — shared sound utility.
// Uses the Web Audio API to synthesize tones (no audio files needed).
// Respects browser autoplay policy: the AudioContext only starts after a
// real user gesture (click/keydown), so call BleedSound.unlock() from
// your first button handler if you want sound ready before it's needed.

(function () {
  const PREF_KEY = 'bleed_sound_enabled';
  // Bumped up — sounds were too quiet at the original levels.
  // Tweak this single number to adjust everything at once.
  const MASTER_VOLUME = 2.2;
  let ctx = null;

  function isEnabled() {
    const stored = localStorage.getItem(PREF_KEY);
    return stored === null ? true : stored === 'true';
  }

  function setEnabled(on) {
    localStorage.setItem(PREF_KEY, on ? 'true' : 'false');
  }

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq, start, duration, type = 'sine', peakGain = 0.14 }) {
    const audioCtx = getCtx();
    if (!audioCtx || !isEnabled()) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = audioCtx.currentTime + start;
    const peak = Math.min(0.9, peakGain * MASTER_VOLUME); // clamp so it can't clip
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  // Soft two-tone chime — used for notifications/alerts.
  function chime() {
    tone({ freq: 740, start: 0, duration: 0.5, type: 'sine', peakGain: 0.24 });
    tone({ freq: 988, start: 0.09, duration: 0.6, type: 'sine', peakGain: 0.2 });
  }

  // Small mechanical click — used for the lamp switch.
  function click() {
    const audioCtx = getCtx();
    if (!audioCtx || !isEnabled()) return;
    const bufferSize = audioCtx.sampleRate * 0.02;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = Math.min(0.9, 0.18 * MASTER_VOLUME);
    noise.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start();
  }

  // Warm low hum that swells in — used right as the lamp glow appears.
  function hum() {
    tone({ freq: 110, start: 0, duration: 1.4, type: 'sine', peakGain: 0.11 });
    tone({ freq: 165, start: 0.05, duration: 1.3, type: 'sine', peakGain: 0.08 });
  }

  function unlock() {
    getCtx();
  }

  window.BleedSound = { chime, click, hum, unlock, isEnabled, setEnabled };
})();
