(function () {
  // 4 pairs — easier for kids / casual play
  const symbols = ["⭐", "🌙", "🐻", "🎈"];
  const board = document.getElementById("board");
  const movesEl = document.getElementById("moves");
  const pairsEl = document.getElementById("pairs");
  const startBtn = document.getElementById("startBtn");
  const loader = document.getElementById("loader");

  let deck = [];
  let open = [];
  let moves = 0;
  let pairs = 0;
  let locked = false;
  let started = false;
  let muted = false;
  let startedAt = 0;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function beep() {
    if (muted || !started) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 660;
      g.gain.value = 0.03;
      o.start();
      setTimeout(function () {
        o.stop();
        ctx.close();
      }, 80);
    } catch (e) {}
  }

  function render() {
    board.innerHTML = "";
    deck.forEach(function (card, index) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card" + (card.open || card.matched ? " open" : "") + (card.matched ? " matched" : "");
      btn.textContent = card.open || card.matched ? card.symbol : "?";
      btn.addEventListener("click", function () {
        onFlip(index);
      });
      board.appendChild(btn);
    });
    movesEl.textContent = String(moves);
    pairsEl.textContent = String(pairs);
  }

  function onFlip(index) {
    if (!started || locked) return;
    const card = deck[index];
    if (card.open || card.matched) return;
    card.open = true;
    open.push(index);
    render();
    beep();

    if (open.length < 2) return;
    locked = true;
    moves += 1;
    const a = deck[open[0]];
    const b = deck[open[1]];
    if (a.symbol === b.symbol) {
      a.matched = true;
      b.matched = true;
      pairs += 1;
      open = [];
      locked = false;
      render();
      if (window.PanPanBridge) {
        window.PanPanBridge.score({ score: pairs * 100 - moves * 2 });
      }
      if (pairs === symbols.length) {
        const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
        if (window.PanPanBridge) {
          window.PanPanBridge.end({
            score: Math.max(0, pairs * 100 - moves * 2),
            durationSeconds: durationSeconds,
            result: "completed",
          });
        }
        startBtn.textContent = "再来一局";
        started = false;
      }
    } else {
      setTimeout(function () {
        a.open = false;
        b.open = false;
        open = [];
        locked = false;
        render();
      }, 900);
    }
  }

  function startGame() {
    deck = shuffle(
      symbols.concat(symbols).map(function (symbol) {
        return { symbol: symbol, open: false, matched: false };
      }),
    );
    open = [];
    moves = 0;
    pairs = 0;
    locked = false;
    started = true;
    startedAt = Date.now();
    startBtn.textContent = "重新开始";
    render();
    if (window.PanPanBridge) {
      window.PanPanBridge.start({ mode: "classic" });
    }
  }

  function boot() {
    if (window.PanPanBridge) {
      window.PanPanBridge.init();
      window.PanPanBridge.on("HOST_INIT", function (payload) {
        muted = Boolean(payload && payload.muted);
      });
      window.PanPanBridge.on("AUDIO_CHANGE", function (payload) {
        muted = Boolean(payload && payload.muted);
      });
      window.PanPanBridge.on("HOST_PAUSE", function () {
        locked = true;
      });
      window.PanPanBridge.on("HOST_RESUME", function () {
        locked = false;
      });
      window.PanPanBridge.ready({ game: "memory-card" });
    }
    loader.style.display = "none";
    startBtn.addEventListener("click", startGame);
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
