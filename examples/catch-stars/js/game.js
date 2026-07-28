(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const startBtn = document.getElementById("startBtn");
  const loader = document.getElementById("loader");

  let running = false;
  let muted = false;
  let score = 0;
  let lives = 5;
  let basketX = 480;
  let stars = [];
  let keys = {};
  let pointerX = null;
  let raf = 0;
  let startedAt = 0;

  function reset() {
    score = 0;
    lives = 5;
    stars = [];
    basketX = canvas.width / 2;
    scoreEl.textContent = "0";
    livesEl.textContent = "5";
  }

  function spawn() {
    stars.push({
      x: 40 + Math.random() * (canvas.width - 80),
      y: -20,
      r: 14 + Math.random() * 8,
      vy: 1.1 + Math.random() * 1.0 + score * 0.006,
    });
  }

  function endGame() {
    running = false;
    cancelAnimationFrame(raf);
    startBtn.textContent = "再来一局";
    if (window.PanPanBridge) {
      window.PanPanBridge.end({
        score: score,
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
        result: lives <= 0 ? "failed" : "completed",
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc((i * 97) % canvas.width, (i * 53) % canvas.height, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#fde68a";
    ctx.fillRect(basketX - 64, canvas.height - 48, 128, 24);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(basketX - 64, canvas.height - 48, 128, 6);

    ctx.fillStyle = "#fef08a";
    stars.forEach(function (s) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function tick() {
    if (!running) return;
    if (keys.ArrowLeft) basketX -= 11;
    if (keys.ArrowRight) basketX += 11;
    if (pointerX !== null) basketX += (pointerX - basketX) * 0.28;
    basketX = Math.max(64, Math.min(canvas.width - 64, basketX));

    if (Math.random() < 0.014) spawn();
    stars.forEach(function (s) {
      s.y += s.vy;
    });

    const next = [];
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const caught =
        s.y >= canvas.height - 62 &&
        s.y <= canvas.height - 18 &&
        Math.abs(s.x - basketX) < 72;
      if (caught) {
        score += 10;
        scoreEl.textContent = String(score);
        if (window.PanPanBridge) window.PanPanBridge.score({ score: score });
      } else if (s.y > canvas.height + 20) {
        lives -= 1;
        livesEl.textContent = String(lives);
        if (lives <= 0) {
          draw();
          endGame();
          return;
        }
      } else {
        next.push(s);
      }
    }
    stars = next;
    draw();
    raf = requestAnimationFrame(tick);
  }

  function startGame() {
    reset();
    running = true;
    startedAt = Date.now();
    startBtn.textContent = "游戏中";
    if (window.PanPanBridge) window.PanPanBridge.start({ mode: "catch" });
    spawn();
    tick();
  }

  function onPointer(clientX) {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((clientX - rect.left) / rect.width) * canvas.width;
  }

  function boot() {
    canvas.addEventListener("pointerdown", function (e) {
      onPointer(e.clientX);
    });
    canvas.addEventListener("pointermove", function (e) {
      if (e.buttons || e.pointerType === "touch") onPointer(e.clientX);
    });
    window.addEventListener("keydown", function (e) {
      keys[e.key] = true;
    });
    window.addEventListener("keyup", function (e) {
      keys[e.key] = false;
    });

    if (window.PanPanBridge) {
      window.PanPanBridge.init();
      window.PanPanBridge.on("HOST_INIT", function (payload) {
        muted = Boolean(payload && payload.muted);
      });
      window.PanPanBridge.on("AUDIO_CHANGE", function (payload) {
        muted = Boolean(payload && payload.muted);
      });
      window.PanPanBridge.on("AD_RESULT", function () {
        // ads disabled should not block gameplay
      });
      window.PanPanBridge.ready({ game: "catch-stars" });
    }

    loader.style.display = "none";
    startBtn.addEventListener("click", function () {
      if (!running) startGame();
    });
    draw();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
