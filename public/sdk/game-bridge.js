(function (global) {
  "use strict";

  var SOURCE = "panpan-game";
  var VERSION = "1.0";
  var hostOrigin = "*";
  var ready = false;
  var listeners = {};

  function emit(type, payload) {
    var list = listeners[type] || [];
    for (var i = 0; i < list.length; i++) {
      try {
        list[i](payload || {});
      } catch (err) {
        console.error("[game-bridge] listener error", err);
      }
    }
  }

  function post(type, payload) {
    if (!global.parent || global.parent === global) return;
    global.parent.postMessage(
      {
        source: SOURCE,
        version: VERSION,
        type: type,
        payload: payload || {},
      },
      hostOrigin,
    );
  }

  function onMessage(event) {
    var data = event.data;
    if (!data || data.source !== "panpan-host" || data.version !== VERSION) {
      return;
    }
    if (event.origin && hostOrigin !== "*" && event.origin !== hostOrigin) {
      return;
    }
    emit(data.type, data.payload || {});
  }

  var Bridge = {
    init: function (options) {
      options = options || {};
      if (options.hostOrigin) hostOrigin = options.hostOrigin;
      if (!ready) {
        global.addEventListener("message", onMessage);
        ready = true;
      }
      global.addEventListener("error", function (e) {
        Bridge.error({
          message: e.message || "Unknown error",
          filename: e.filename,
          lineno: e.lineno,
        });
      });
      global.addEventListener("unhandledrejection", function (e) {
        Bridge.error({
          message: String(e.reason || "Unhandled rejection"),
        });
      });
    },
    on: function (type, handler) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    },
    ready: function (payload) {
      post("GAME_READY", payload);
    },
    start: function (payload) {
      post("GAME_START", payload);
    },
    pause: function (payload) {
      post("GAME_PAUSE", payload);
    },
    resume: function (payload) {
      post("GAME_RESUME", payload);
    },
    end: function (payload) {
      post("GAME_END", payload);
    },
    score: function (payload) {
      post("SCORE_UPDATE", payload);
    },
    levelComplete: function (payload) {
      post("LEVEL_COMPLETE", payload);
    },
    error: function (payload) {
      post("GAME_ERROR", payload);
    },
    requestResize: function (payload) {
      post("RESIZE_REQUEST", payload);
    },
    requestFullscreen: function (payload) {
      post("FULLSCREEN_REQUEST", payload);
    },
    requestAd: function (payload) {
      post("AD_REQUEST", payload);
    },
    storageKey: function (gameId, key) {
      return "panpan_game_" + gameId + "_" + key;
    },
  };

  global.PanPanBridge = Bridge;
})(typeof window !== "undefined" ? window : globalThis);
