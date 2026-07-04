/* data.js — helper di atas window.JLPT_DATA + generator soal runtime */
(function () {
  "use strict";
  function all() { return (window.JLPT_DATA || []).slice(); }
  function byId(id) { return all().filter(function (g) { return g.id === id; })[0] || null; }
  function byLevel(lv) { return all().filter(function (g) { return g.level === lv; }); }

  function search(list, query, opts) {
    opts = opts || {};
    var q = (query || "").trim().toLowerCase();
    return list.filter(function (g) {
      if (opts.level && opts.level !== "all" && g.level !== opts.level) return false;
      if (opts.difficulty && opts.difficulty !== "all" && String(g.difficulty) !== String(opts.difficulty)) return false;
      if (opts.status && opts.status !== "all") {
        var st = window.Store ? window.Store.getLearned(g.id) : "none";
        if (opts.status === "learned" && st !== "learned") return false;
        if (opts.status === "learning" && st !== "learning") return false;
        if (opts.status === "none" && st !== "none") return false;
      }
      if (!q) return true;
      var hay = [g.grammar, g.reading, g.romaji, g.meaning].join(" ").toLowerCase();
      var words = q.split(/\s+/);
      return words.every(function (word) {
        return hay.indexOf(word) >= 0;
      });
    });
  }

  /* Jumlah soal yang tersedia (seed MCQ + soal yang bisa digenerate) */
  function countQuestions(g) {
    var mcq = (g.quiz || []).length;
    var withG = (g.examples || []).filter(function (e) { return e.g && e.jp.indexOf(e.g) >= 0; });
    var withTokens = (g.examples || []).filter(function (e) { return e.tokens && e.tokens.length >= 2; });
    return { mcq: mcq, fill: withG.length, arrange: withTokens.length, total: mcq + withG.length + withTokens.length };
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function detailLink(id) { return "grammar-detail.html?id=" + encodeURIComponent(id); }

  /* Bangun kumpulan soal untuk satu grammar */
  function buildQuestions(g, types) {
    types = types || { mcq: true, fill: true, arrange: true };
    var out = [];
    if (types.mcq) {
      (g.quiz || []).forEach(function (q) {
        out.push({
          type: "mcq", grammarId: g.id, grammar: g.grammar, level: g.level,
          question: q.q, options: q.options.slice(), answer: q.answer,
          explanation: q.explanation, why: q.why || []
        });
      });
    }
    if (types.fill) {
      (g.examples || []).forEach(function (e) {
        if (!e.g || e.jp.indexOf(e.g) < 0) return;
        out.push({
          type: "fill", grammarId: g.id, grammar: g.grammar, level: g.level,
          question: e.jp.replace(e.g, "\uff3f\uff3f\uff3f"), answer: e.g,
          furigana: e.furigana, translation: e.id,
          explanation: "Pola yang diuji: " + g.grammar + ". Kalimat lengkap: " + e.jp + " (" + e.id + ")"
        });
      });
    }
    if (types.arrange) {
      (g.examples || []).forEach(function (e) {
        if (!e.tokens || e.tokens.length < 2) return;
        // hanya pakai bila token tersambung mendekati kalimat asli
        out.push({
          type: "arrange", grammarId: g.id, grammar: g.grammar, level: g.level,
          question: e.id, tokens: shuffle(e.tokens), answer: e.tokens.join(""),
          ordered: e.tokens.slice(), furigana: e.furigana,
          explanation: "Kalimat benar: " + e.jp + " (" + e.id + "). Pola: " + g.grammar + "."
        });
      });
    }
    return out;
  }

  /* Kumpulan soal lintas grammar untuk Random / Daily / level page */
  function buildPool(opts) {
    opts = opts || {};
    var src = opts.level && opts.level !== "all" ? byLevel(opts.level) : all();
    if (opts.grammarIds) src = src.filter(function (g) { return opts.grammarIds.indexOf(g.id) >= 0; });
    var pool = [];
    src.forEach(function (g) { pool = pool.concat(buildQuestions(g, opts.types)); });
    pool = shuffle(pool);
    if (opts.limit) pool = pool.slice(0, opts.limit);
    return pool;
  }

  /* Grammar terlemah berdasar statistik (untuk Weak Practice) */
  function weakGrammarIds(limit) {
    var s = window.Store ? window.Store.getStats() : { byGrammar: {} };
    var arr = Object.keys(s.byGrammar || {}).map(function (id) {
      var x = s.byGrammar[id];
      return { id: id, acc: x.total ? x.correct / x.total : 1, total: x.total };
    }).filter(function (x) { return x.total >= 1 && byId(x.id); });
    arr.sort(function (a, b) { return a.acc - b.acc; });
    var ids = arr.slice(0, limit || 5).map(function (x) { return x.id; });
    return ids;
  }

  window.Data = {
    all: all, byId: byId, byLevel: byLevel, search: search,
    countQuestions: countQuestions, buildQuestions: buildQuestions, buildPool: buildPool,
    weakGrammarIds: weakGrammarIds, shuffle: shuffle, detailLink: detailLink
  };
})();
