/* Flappy Wings – tiny Web Audio sound engine (no audio files needed) */
(function () {
  "use strict";

  let ctx = null;
  let muted = false;

  try { muted = localStorage.getItem("fw_muted") === "1"; } catch (e) { /* storage unavailable */ }

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, to = null, type = "square", dur = 0.12, vol = 0.12, delay = 0 }) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  window.Sfx = {
    unlock: ensure,
    flap()  { tone({ freq: 520, to: 780, type: "triangle", dur: 0.09, vol: 0.10 }); },
    point() { tone({ freq: 880, type: "square", dur: 0.07, vol: 0.06 });
              tone({ freq: 1320, type: "square", dur: 0.10, vol: 0.06, delay: 0.07 }); },
    hit()   { tone({ freq: 220, to: 60, type: "sawtooth", dur: 0.25, vol: 0.14 }); },
    die()   { tone({ freq: 400, to: 90, type: "triangle", dur: 0.5, vol: 0.12, delay: 0.15 }); },
    swoosh(){ tone({ freq: 300, to: 900, type: "sine", dur: 0.18, vol: 0.06 }); },
    isMuted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem("fw_muted", muted ? "1" : "0"); } catch (e) { /* ignore */ }
      return muted;
    }
  };
})();
