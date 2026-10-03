/* =========================================================
   Flappy Wings – a Flappy Bird-style game
   HTML5 Canvas + vanilla JS, fixed 60 Hz timestep.
   ========================================================= */
(function () {
  "use strict";

  // ---------- Setup ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = 400, H = 600;
  const GROUND_H = 90;
  const PLAY_H = H - GROUND_H;

  // Crisp rendering on high-DPI screens
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  // ---------- Tunables ----------
  const CFG = {
    gravity: 0.42,
    flapVelocity: -7.4,
    maxFall: 10,
    pipeWidth: 68,
    pipeGapStart: 160,
    pipeGapMin: 120,
    pipeSpacing: 210,     // horizontal distance between pipes
    speedStart: 2.4,
    speedMax: 3.6,
    birdX: 100,
    birdR: 15
  };

  const STATE = { READY: 0, PLAYING: 1, DYING: 2, OVER: 3, PAUSED: 4 };

  // ---------- Storage helpers ----------
  function loadBest() {
    try { return parseInt(localStorage.getItem("fw_best") || "0", 10) || 0; } catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem("fw_best", String(v)); } catch (e) { /* ignore */ }
  }

  // ---------- World ----------
  let state, bird, pipes, score, best = loadBest(), speed, gap;
  let groundX = 0, frame = 0, flash = 0, shake = 0, overTimer = 0, newBest = false;
  let particles = [];
  const clouds = Array.from({ length: 6 }, (_, i) => ({
    x: i * 90 + Math.random() * 60,
    y: 40 + Math.random() * 180,
    s: 0.6 + Math.random() * 0.8
  }));
  const hills = Array.from({ length: 8 }, (_, i) => ({ x: i * 70, h: 40 + Math.random() * 50 }));

  function reset() {
    state = STATE.READY;
    bird = { x: CFG.birdX, y: PLAY_H / 2 - 20, vy: 0, rot: 0, wing: 0 };
    pipes = [];
    particles = [];
    score = 0;
    speed = CFG.speedStart;
    gap = CFG.pipeGapStart;
    overTimer = 0;
    newBest = false;
  }

  function spawnPipe(x) {
    const margin = 60;
    const top = margin + Math.random() * (PLAY_H - gap - margin * 2);
    pipes.push({ x, top, gap, passed: false });
  }

  // ---------- Input ----------
  function flap() {
    Sfx.unlock();
    switch (state) {
      case STATE.READY:
        state = STATE.PLAYING;
        spawnPipe(W + 40);
        // fall through to flap
      case STATE.PLAYING:
        bird.vy = CFG.flapVelocity;
        Sfx.flap();
        for (let i = 0; i < 4; i++) {
          particles.push({
            x: bird.x - 10, y: bird.y + 4,
            vx: -1 - Math.random() * 1.5, vy: Math.random() * 2 - 0.5,
            life: 20 + Math.random() * 10, max: 30
          });
        }
        break;
      case STATE.OVER:
        if (overTimer > 40) { Sfx.swoosh(); reset(); }
        break;
      case STATE.PAUSED:
        state = STATE.PLAYING;
        break;
    }
  }

  function togglePause() {
    if (state === STATE.PLAYING) state = STATE.PAUSED;
    else if (state === STATE.PAUSED) state = STATE.PLAYING;
  }

  const muteBtn = document.getElementById("muteBtn");
  function syncMute() { muteBtn.textContent = Sfx.isMuted() ? "🔇" : "🔊"; }
  muteBtn.addEventListener("click", (e) => { e.stopPropagation(); Sfx.toggle(); syncMute(); muteBtn.blur(); });
  syncMute();

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      if (!e.repeat) flap();
    } else if (e.code === "KeyP" || e.code === "Escape") {
      togglePause();
    } else if (e.code === "KeyM") {
      Sfx.toggle(); syncMute();
    } else if (e.code === "Enter" && state === STATE.OVER) {
      flap();
    }
  });
  canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); flap(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === STATE.PLAYING) state = STATE.PAUSED;
  });

  // ---------- Update ----------
  function update() {
    frame++;
    if (flash > 0) flash -= 0.05;
    if (shake > 0) shake -= 1;

    if (state === STATE.PAUSED) return;

    // Background scroll (not while dead)
    if (state === STATE.READY || state === STATE.PLAYING) {
      groundX = (groundX - speed) % 24;
      clouds.forEach(c => { c.x -= speed * 0.15 * c.s; if (c.x < -80) { c.x = W + 40; c.y = 40 + Math.random() * 180; } });
      hills.forEach(h => { h.x -= speed * 0.35; if (h.x < -70) h.x += 70 * hills.length; });
    }

    bird.wing += state === STATE.PLAYING || state === STATE.READY ? 0.3 : 0;

    if (state === STATE.READY) {
      bird.y = PLAY_H / 2 - 20 + Math.sin(frame / 10) * 8;
      bird.rot = 0;
    } else if (state === STATE.PLAYING || state === STATE.DYING) {
      bird.vy = Math.min(bird.vy + CFG.gravity, CFG.maxFall);
      bird.y += bird.vy;
      // rotation: nose up when rising, dive when falling
      const target = bird.vy < 0 ? -0.45 : Math.min(Math.PI / 2, bird.vy * 0.12);
      bird.rot += (target - bird.rot) * 0.15;

      if (bird.y < -40) { bird.y = -40; bird.vy = 0; }

      if (bird.y + CFG.birdR >= PLAY_H) {
        bird.y = PLAY_H - CFG.birdR;
        if (state === STATE.PLAYING) die(true);
        gameOver();
      }
    } else if (state === STATE.OVER) {
      overTimer++;
    }

    if (state === STATE.PLAYING) {
      // move pipes
      for (const p of pipes) p.x -= speed;
      if (pipes.length && pipes[0].x + CFG.pipeWidth < -10) pipes.shift();
      const last = pipes[pipes.length - 1];
      if (!last || last.x < W - CFG.pipeSpacing) spawnPipe(W + 10);

      // scoring + collisions
      for (const p of pipes) {
        if (!p.passed && p.x + CFG.pipeWidth < bird.x) {
          p.passed = true;
          score++;
          Sfx.point();
          // difficulty ramp
          speed = Math.min(CFG.speedMax, CFG.speedStart + score * 0.04);
          gap = Math.max(CFG.pipeGapMin, CFG.pipeGapStart - score * 1.5);
        }
        if (hitsPipe(p)) { die(false); break; }
      }
    }

    // particles
    particles = particles.filter(pt => {
      pt.x += pt.vx; pt.y += pt.vy; pt.life--;
      return pt.life > 0;
    });
  }

  function hitsPipe(p) {
    const r = CFG.birdR - 2; // slightly forgiving hitbox
    const bx = bird.x, by = bird.y;
    const rects = [
      { x: p.x, y: -1000, w: CFG.pipeWidth, h: p.top + 1000 },
      { x: p.x, y: p.top + p.gap, w: CFG.pipeWidth, h: PLAY_H - (p.top + p.gap) + 10 }
    ];
    return rects.some(rc => {
      const cx = Math.max(rc.x, Math.min(bx, rc.x + rc.w));
      const cy = Math.max(rc.y, Math.min(by, rc.y + rc.h));
      const dx = bx - cx, dy = by - cy;
      return dx * dx + dy * dy < r * r;
    });
  }

  function die(groundHit) {
    if (state !== STATE.PLAYING) return;
    state = STATE.DYING;
    flash = 1;
    shake = 12;
    Sfx.hit();
    if (!groundHit) Sfx.die();
    if (!groundHit && bird.vy < 0) bird.vy = 0;
  }

  function gameOver() {
    if (state === STATE.OVER) return;
    state = STATE.OVER;
    overTimer = 0;
    if (score > best) { best = score; newBest = true; saveBest(best); }
  }

  // ---------- Drawing ----------
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, PLAY_H);
    g.addColorStop(0, "#4ec0ca");
    g.addColorStop(1, "#bfeef0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, PLAY_H);

    // sun
    ctx.fillStyle = "rgba(255, 245, 200, 0.8)";
    ctx.beginPath(); ctx.arc(320, 90, 34, 0, Math.PI * 2); ctx.fill();

    // clouds
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (const c of clouds) {
      const s = c.s;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 18 * s, 0, Math.PI * 2);
      ctx.arc(c.x + 20 * s, c.y - 10 * s, 22 * s, 0, Math.PI * 2);
      ctx.arc(c.x + 44 * s, c.y, 18 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // city / hills silhouette
    ctx.fillStyle = "#8fd9a0";
    for (const h of hills) {
      ctx.beginPath();
      ctx.ellipse(h.x + 35, PLAY_H, 50, h.h, 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = "#6cc584";
    for (const h of hills) {
      ctx.beginPath();
      ctx.ellipse(h.x + 70, PLAY_H, 40, h.h * 0.6, 0, Math.PI, 0);
      ctx.fill();
    }
  }

  function drawPipe(p) {
    const w = CFG.pipeWidth;
    const capH = 26, capOver = 5;
    const body = (x, y, h) => {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, "#5fae2e");
      g.addColorStop(0.35, "#9be15d");
      g.addColorStop(1, "#4a8f22");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#2f5d14";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
    };
    const cap = (x, y) => {
      const g = ctx.createLinearGradient(x - capOver, 0, x + w + capOver, 0);
      g.addColorStop(0, "#5fae2e");
      g.addColorStop(0.35, "#a8ec6a");
      g.addColorStop(1, "#4a8f22");
      ctx.fillStyle = g;
      ctx.fillRect(x - capOver, y, w + capOver * 2, capH);
      ctx.strokeStyle = "#2f5d14";
      ctx.lineWidth = 3;
      ctx.strokeRect(x - capOver, y, w + capOver * 2, capH);
    };
    // top pipe
    body(p.x, -5, p.top + 5 - capH);
    cap(p.x, p.top - capH);
    // bottom pipe
    const by = p.top + p.gap;
    body(p.x, by + capH, PLAY_H - by - capH + 5);
    cap(p.x, by);
  }

  function drawGround() {
    ctx.fillStyle = "#ded895";
    ctx.fillRect(0, PLAY_H, W, GROUND_H);
    ctx.fillStyle = "#73bf2e";
    ctx.fillRect(0, PLAY_H, W, 16);
    ctx.fillStyle = "#5a9e22";
    for (let x = groundX; x < W + 24; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, PLAY_H + 16);
      ctx.lineTo(x + 12, PLAY_H);
      ctx.lineTo(x + 24, PLAY_H);
      ctx.lineTo(x + 12, PLAY_H + 16);
      ctx.fill();
    }
    ctx.fillStyle = "#3d6e17";
    ctx.fillRect(0, PLAY_H, W, 3);
    ctx.fillStyle = "#c9c27a";
    ctx.fillRect(0, PLAY_H + 16, W, 4);
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);

    // body
    ctx.fillStyle = "#f7c843";
    ctx.strokeStyle = "#5a3a0a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 15, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // belly
    ctx.fillStyle = "#fbe7a1";
    ctx.beginPath();
    ctx.ellipse(-2, 6, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // wing (flapping)
    const wy = Math.sin(bird.wing) * 6;
    ctx.fillStyle = "#fff6d5";
    ctx.beginPath();
    ctx.ellipse(-8, 1 + wy * 0.5, 9, 6 + Math.abs(wy) * 0.3, -0.2, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // eye
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(8, -5, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(10, -5, 3, 0, Math.PI * 2); ctx.fill();

    // beak
    ctx.fillStyle = "#f2702e";
    ctx.beginPath();
    ctx.moveTo(13, 1); ctx.lineTo(26, 4); ctx.lineTo(13, 9); ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.restore();
  }

  function drawParticles() {
    for (const pt of particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max) * 0.8;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function outlinedText(text, x, y, size, fill = "#fff", align = "center") {
    ctx.font = `bold ${size}px "Trebuchet MS", system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(4, size / 6);
    ctx.strokeStyle = "#2b1b05";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function medalFor(s) {
    if (s >= 40) return { name: "Platinum", c: "#e5e4e2" };
    if (s >= 30) return { name: "Gold", c: "#ffd700" };
    if (s >= 20) return { name: "Silver", c: "#c0c0c0" };
    if (s >= 10) return { name: "Bronze", c: "#cd7f32" };
    return null;
  }

  function drawUI() {
    if (state === STATE.PLAYING || state === STATE.DYING || state === STATE.PAUSED) {
      outlinedText(String(score), W / 2, 70, 52);
    }

    if (state === STATE.READY) {
      outlinedText("Flappy Wings", W / 2, 130, 44, "#f7c843");
      outlinedText("Get Ready!", W / 2, 195, 30, "#9be15d");
      const a = 0.6 + Math.sin(frame / 12) * 0.4;
      ctx.globalAlpha = a;
      outlinedText("Tap / Space to flap", W / 2, 390, 20);
      ctx.globalAlpha = 1;
      if (best > 0) outlinedText("Best: " + best, W / 2, 430, 18, "#fbe7a1");
    }

    if (state === STATE.PAUSED) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, W, H);
      outlinedText("Paused", W / 2, H / 2 - 20, 42);
      outlinedText("Press P or tap to resume", W / 2, H / 2 + 25, 18);
    }

    if (state === STATE.OVER) {
      const slide = Math.min(1, overTimer / 25);
      const ease = 1 - Math.pow(1 - slide, 3);
      outlinedText("Game Over", W / 2, 110 - (1 - ease) * 60, 44, "#f2702e");

      // score panel
      const pw = 280, ph = 150, px = (W - pw) / 2, py = 170 + (1 - ease) * 300;
      ctx.fillStyle = "#ded895";
      ctx.strokeStyle = "#5a3a0a";
      ctx.lineWidth = 4;
      roundRect(px, py, pw, ph, 14); ctx.fill(); ctx.stroke();

      const m = medalFor(score);
      ctx.fillStyle = "#c9c27a";
      ctx.beginPath(); ctx.arc(px + 62, py + 75, 34, 0, Math.PI * 2); ctx.fill();
      if (m) {
        ctx.fillStyle = m.c;
        ctx.strokeStyle = "#5a3a0a"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px + 62, py + 75, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath(); ctx.arc(px + 54, py + 66, 9, 0, Math.PI * 2); ctx.fill();
        outlinedText(m.name, px + 62, py + 128, 14, m.c);
      } else {
        outlinedText("No medal", px + 62, py + 128, 13, "#fff");
      }

      outlinedText("SCORE", px + pw - 30, py + 28, 16, "#f2702e", "right");
      outlinedText(String(score), px + pw - 30, py + 56, 30, "#fff", "right");
      outlinedText("BEST", px + pw - 30, py + 92, 16, "#f2702e", "right");
      outlinedText(String(best), px + pw - 30, py + 120, 30, "#fff", "right");
      if (newBest) outlinedText("NEW!", px + pw - 100, py + 120, 14, "#ff4d4d", "right");

      if (overTimer > 40) {
        ctx.globalAlpha = 0.6 + Math.sin(frame / 10) * 0.4;
        outlinedText("Tap / Space to play again", W / 2, 370, 20);
        ctx.globalAlpha = 1;
      }
    }
  }

  function render() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    drawSky();
    for (const p of pipes) drawPipe(p);
    drawGround();
    drawParticles();
    drawBird();
    ctx.restore();

    drawUI();

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- Main loop (fixed timestep) ----------
  const STEP = 1000 / 60;
  let acc = 0, last = performance.now();

  function loop(now) {
    acc += Math.min(now - last, 250);
    last = now;
    while (acc >= STEP) { update(); acc -= STEP; }
    render();
    requestAnimationFrame(loop);
  }

  reset();
  requestAnimationFrame(loop);
})();
