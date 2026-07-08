/* storage.js — lapisan localStorage untuk seluruh data progres pengguna */
(function () {
  "use strict";
  var P = "jlpt_";
  function get(key, def) {
    try {
      var raw = localStorage.getItem(P + key);
      return raw == null ? def : JSON.parse(raw);
    } catch (e) { return def; }
  }
  function set(key, val) {
    try { localStorage.setItem(P + key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------- Statistik & jawaban ---------- */
  function recordAnswer(grammarId, level, isCorrect) {
    var s = get("stats", {});
    s.total = (s.total || 0) + 1;
    s.correct = (s.correct || 0) + (isCorrect ? 1 : 0);
    s.byLevel = s.byLevel || {};
    var lv = (s.byLevel[level] = s.byLevel[level] || { total: 0, correct: 0 });
    lv.total++; if (isCorrect) lv.correct++;
    s.byGrammar = s.byGrammar || {};
    var g = (s.byGrammar[grammarId] = s.byGrammar[grammarId] || { total: 0, correct: 0 });
    g.total++; if (isCorrect) g.correct++;
    set("stats", s);
  }
  function getStats() {
    var s = get("stats", {});
    s.total = s.total || 0; s.correct = s.correct || 0;
    s.byLevel = s.byLevel || {}; s.byGrammar = s.byGrammar || {};
    return s;
  }
  function accuracy(c, t) { return t ? Math.round((c / t) * 100) : 0; }

  /* ---------- Review kesalahan ---------- */
  function addMistake(m) {
    var list = get("mistakes", []);
    m.id = m.id || ("m" + Date.now() + Math.floor(Math.random() * 1000));
    m.understood = false;
    m.ts = Date.now();
    // hindari duplikat persis pertanyaan yang sama yang belum dipahami
    list = list.filter(function (x) { return !(x.question === m.question && !x.understood); });
    list.unshift(m);
    if (list.length > 500) list = list.slice(0, 500);
    set("mistakes", list);
  }
  function getMistakes() { return get("mistakes", []); }
  function markUnderstood(id) {
    var list = get("mistakes", []);
    list.forEach(function (m) { if (m.id === id) m.understood = true; });
    set("mistakes", list);
  }
  function removeMistake(id) {
    set("mistakes", get("mistakes", []).filter(function (m) { return m.id !== id; }));
  }
  function unresolvedMistakeCount() {
    return get("mistakes", []).filter(function (m) { return !m.understood; }).length;
  }

  /* ---------- Bookmark ---------- */
  function bmGrammars() { return get("bm_grammars", []); }
  function toggleGrammarBookmark(id) {
    var l = bmGrammars(), i = l.indexOf(id);
    if (i >= 0) l.splice(i, 1); else l.push(id);
    set("bm_grammars", l); return i < 0;
  }
  function isGrammarBookmarked(id) { return bmGrammars().indexOf(id) >= 0; }
  function bmQuestions() { return get("bm_questions", []); }
  function toggleQuestionBookmark(q) {
    var l = bmQuestions(), key = q.question || q.q || q.sentence;
    var i = -1;
    for (var k = 0; k < l.length; k++) { if ((l[k].question || l[k].q || l[k].sentence) === key) { i = k; break; } }
    if (i >= 0) l.splice(i, 1); else l.push(q);
    set("bm_questions", l); return i < 0;
  }

  /* ---------- Riwayat ---------- */
  function addHistory(entry) {
    var l = get("history", []);
    entry.ts = entry.ts || Date.now();
    l.unshift(entry);
    if (l.length > 300) l = l.slice(0, 300);
    set("history", l);
  }
  function getHistory() { return get("history", []); }

  /* ---------- Catatan pribadi ---------- */
  function getNote(id) { return get("note_" + id, ""); }
  function setNote(id, text) { set("note_" + id, text); }

  /* ---------- Status dipelajari ---------- */
  function getLearned(id) { return get("learned", {})[id] || "none"; }
  function setLearned(id, status) {
    var m = get("learned", {}); m[id] = status; set("learned", m);
  }

  /* ---------- Continue learning ---------- */
  function setLast(id) { set("last_grammar", id); }
  function getLast() { return get("last_grammar", null); }

  /* ---------- Daily Quest ---------- */
  function markDailyQuestItemAsCompleted(id) {
    try {
      var quest = get("daily_quest", null);
      if (!quest) return;
      var today = new Date().toDateString();
      if (quest.date === today) {
        var updated = false;
        quest.items.forEach(function (it) {
          if (it.type === "grammar" && it.id === id && !it.completed) {
            it.completed = true;
            updated = true;
          }
        });
        if (updated) {
          set("daily_quest", quest);
        }
      }
    } catch (e) {}
  }

  function incrementDailyQuestProgress(type, amount) {
    if (amount === undefined) amount = 1;
    try {
      var quest = get("daily_quest", null);
      if (!quest) return;
      var today = new Date().toDateString();
      if (quest.date === today) {
        var updated = false;
        quest.items.forEach(function (it) {
          if (it.type === type && !it.completed) {
            it.progress = (it.progress || 0) + amount;
            if (it.progress >= it.target) {
              it.progress = it.target;
              it.completed = true;
            }
            updated = true;
          }
        });
        if (updated) {
          set("daily_quest", quest);
        }
      }
    } catch (e) {}
  }

  window.Store = {
    get: get, set: set,
    recordAnswer: recordAnswer, getStats: getStats, accuracy: accuracy,
    addMistake: addMistake, getMistakes: getMistakes, markUnderstood: markUnderstood,
    removeMistake: removeMistake, unresolvedMistakeCount: unresolvedMistakeCount,
    toggleGrammarBookmark: toggleGrammarBookmark, isGrammarBookmarked: isGrammarBookmarked,
    bmGrammars: bmGrammars, bmQuestions: bmQuestions, toggleQuestionBookmark: toggleQuestionBookmark,
    addHistory: addHistory, getHistory: getHistory,
    getNote: getNote, setNote: setNote,
    getLearned: getLearned, setLearned: setLearned,
    setLast: setLast, getLast: getLast,
    markDailyQuestItemAsCompleted: markDailyQuestItemAsCompleted,
    incrementDailyQuestProgress: incrementDailyQuestProgress
  };
})();
