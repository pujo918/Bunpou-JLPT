/* quiz.js — mesin latihan: render soal, feedback rinci, layar hasil */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(s) { return String(s || "").replace(/[\s\u3000\uff3f_]/g, ""); }

  function getLocalTranslation(q) {
    var fullJp = speakText(q);
    if (!fullJp) return "";
    var normFull = fullJp.replace(/[\s\u3000\uff3f_()（）.,?!。、\/~\-—?·]/g, "");
    if (!normFull) return "";
    var g = window.JLPT_DATA && window.JLPT_DATA.filter(function(x) { return x.id === q.grammarId; })[0];
    if (g && g.examples) {
      for (var i = 0; i < g.examples.length; i++) {
        var ex = g.examples[i];
        var normEx = ex.jp.replace(/[\s\u3000\uff3f_()（）.,?!。、\/~\-—?·]/g, "");
        if (normEx.indexOf(normFull) >= 0 || normFull.indexOf(normEx) >= 0) {
          return ex.id;
        }
      }
    }
    if (window.JLPT_DATA) {
      for (var k = 0; k < window.JLPT_DATA.length; k++) {
        var otherG = window.JLPT_DATA[k];
        if (otherG.examples) {
          for (var i = 0; i < otherG.examples.length; i++) {
            var ex = otherG.examples[i];
            var normEx = ex.jp.replace(/[\s\u3000\uff3f_()（）.,?!。、\/~\-—?·]/g, "");
            if (normEx.indexOf(normFull) >= 0 || normFull.indexOf(normEx) >= 0) {
              return ex.id;
            }
          }
        }
      }
    }
    return "";
  }

  function translateSentence(q, containerEl) {
    if (q.type !== "mcq") {
      containerEl.style.display = "none";
      return;
    }
    var fullJp = speakText(q);
    if (!fullJp || !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(fullJp)) {
      containerEl.style.display = "none";
      return;
    }
    var localTrans = getLocalTranslation(q);
    if (localTrans) {
      containerEl.innerHTML = '<div class="q-translation"><b>Arti Kalimat:</b> ' + esc(localTrans) + '</div>';
      return;
    }
    var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=id&dt=t&q=" + encodeURIComponent(fullJp);
    containerEl.innerHTML = '<div class="q-translation loading"><b>Arti Kalimat:</b> <span class="muted">Menerjemahkan...</span></div>';
    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data[0] && data[0][0] && data[0][0][0]) {
          containerEl.innerHTML = '<div class="q-translation"><b>Arti Kalimat:</b> ' + esc(data[0][0][0]) + '</div>';
        } else {
          containerEl.style.display = "none";
        }
      })
      .catch(function() {
        containerEl.style.display = "none";
      });
  }


  /* ---------- Web Speech API ---------- */
  function speak(text) {
    if (!("speechSynthesis" in window)) { window.Nav && Nav.toast("Browser tidak mendukung audio."); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP"; u.rate = 0.85;
      window.speechSynthesis.speak(u);
      return u;
    } catch (e) {}
  }

  var PILL = { N4: "pill-n4", N3: "pill-n3" };
  var TYPE_LABEL = { mcq: "Pilihan Ganda", fill: "Isi Bagian Kosong", arrange: "Susun Kata" };

  /* ---------- Resolusi jawaban benar (mendukung index angka ATAU teks opsi) ---------- */
  function correctIndexOf(q) {
    if (typeof q.answer === "number") return q.answer;
    if (q.options && q.options.length) {
      var i = q.options.indexOf(q.answer);
      if (i >= 0) return i;
      // fallback: cocokkan tanpa spasi/underscore
      for (var k = 0; k < q.options.length; k++) {
        if (norm(q.options[k]) === norm(q.answer)) return k;
      }
    }
    return -1;
  }
  function answerText(q) {
    if (q.type === "mcq") {
      var i = correctIndexOf(q);
      if (q.options && i >= 0 && i < q.options.length) return q.options[i];
      return typeof q.answer === "string" ? q.answer : "";
    }
    return q.answer;
  }

  /* Bangun model MCQ ternormalisasi + acak urutan opsi.
     Tiap opsi: { text, correct, why }. why untuk opsi salah diambil dari q.why
     secara berurutan (melewati opsi benar). */
  function buildMcq(q) {
    var ci = correctIndexOf(q);
    var wrongWhy = q.why || [];
    var w = 0, items = [];
    (q.options || []).forEach(function (text, oi) {
      var isC = oi === ci;
      items.push({ text: text, correct: isC, why: isC ? "" : (wrongWhy[w++] || "") });
    });
    // Fisher–Yates shuffle agar jawaban benar tidak selalu di posisi A
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = items[i]; items[i] = items[j]; items[j] = t;
    }
    var correctIndex = -1;
    for (var k = 0; k < items.length; k++) { if (items[k].correct) { correctIndex = k; break; } }
    return { items: items, correctIndex: correctIndex };
  }

  /* =========================================================
     Render satu soal. onDone(isCorrect, questionObj)
     ========================================================= */
  function renderQuestion(host, q, onDone, ctx) {
    ctx = ctx || {};
    host.innerHTML = "";
    var card = document.createElement("div");
    card.className = "quiz-card";

    var mcqModel = q.type === "mcq" ? buildMcq(q) : null;

    var top = '<div class="quiz-top">' +
      '<span class="pill ' + (PILL[q.level] || "") + '">' + esc(q.level) + "</span>" +
      '<span class="pill pill-type">' + esc(TYPE_LABEL[q.type] || "") + "</span>" +
      (ctx.progress ? '<span class="meta">' + esc(ctx.progress) + "</span>" : "") +
      '<button class="bookmark-btn" title="Bookmark soal">\u2605</button>' +
      "</div>";

    var body = "";
    if (q.type === "mcq") body = mcqBody(q, mcqModel);
    else if (q.type === "fill") body = fillBody(q);
    else if (q.type === "arrange") body = arrangeBody(q);

    card.innerHTML = top + '<div class="quiz-body">' + body + "</div>" +
      '<div class="feedback hidden"></div>';
    host.appendChild(card);

    var fb = card.querySelector(".feedback");
    var answered = false;

    // bookmark
    var bmBtn = card.querySelector(".bookmark-btn");
    if (window.Store && Store.bmQuestions().some(function (x) { return (x.question || x.q || x.sentence) === q.question; })) bmBtn.classList.add("on");
    bmBtn.addEventListener("click", function () {
      var on = Store.toggleQuestionBookmark(q);
      bmBtn.classList.toggle("on", on);
      Nav.toast(on ? "Soal disimpan ke bookmark" : "Bookmark dihapus");
    });

    function finish(isCorrect) {
      if (answered) return; answered = true;
      showFeedback(fb, q, isCorrect, onDone, mcqModel);
      if (window.Store) {
        Store.recordAnswer(q.grammarId, q.level, isCorrect);
        if (!isCorrect) Store.addMistake({
          grammarId: q.grammarId, grammar: q.grammar, level: q.level, type: q.type,
          question: q.question, answerText: answerText(q), explanation: q.explanation
        });
      }
    }

    if (q.type === "mcq") bindMcq(card, mcqModel, finish);
    else if (q.type === "fill") bindFill(card, q, finish);
    else if (q.type === "arrange") bindArrange(card, q, finish);
  }

  function speakText(q) {
    if (q.type === "mcq") {
      var t = answerText(q);
      if (q.question && q.question.indexOf("\uff3f") >= 0) return q.question.replace(/\uff3f+/g, t);
      if (q.question && /\uff08\s*\uff09|\(\s*\)/.test(q.question)) return q.question.replace(/\uff08\s*\uff09|\(\s*\)/, t);
      return t;
    }
    return q.answer || q.question || "";
  }

  /* ---------- MCQ ---------- */
  function mcqBody(q, model) {
    var opts = model.items.map(function (o, i) {
      var key = String.fromCharCode(65 + i);
      return '<button class="option" data-i="' + i + '">' +
        '<span class="key">' + key + "</span>" +
        '<span class="opt-text jp">' + esc(o.text) + "</span>" +
        '<span class="mark"></span></button>';
    }).join("");
    return '<div class="q-prompt jp">' + esc(q.question) + "</div>" +
      '<div class="options">' + opts + "</div>";
  }
  function bindMcq(card, model, finish) {
    card.querySelectorAll(".option").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (card.dataset.done) return; card.dataset.done = "1";
        var i = parseInt(btn.dataset.i, 10);
        var correct = i === model.correctIndex;
        card.querySelectorAll(".option").forEach(function (b) {
          var bi = parseInt(b.dataset.i, 10);
          b.disabled = true;
          if (bi === model.correctIndex) b.classList.add("correct");
          else if (bi === i) b.classList.add("wrong");
        });
        finish(correct);
      });
    });
  }

  /* ---------- Isi bagian kosong ---------- */
  function fillBody(q) {
    return '<div class="q-sentence jp">' + esc(q.question) + "</div>" +
      (q.translation ? '<div class="muted">' + esc(q.translation) + "</div>" : "") +
      '<input class="fill-input jp" type="text" placeholder="Ketik bagian yang hilang\u2026" autocomplete="off">' +
      '<div class="quiz-actions"><button class="btn btn-primary btn-check">Periksa</button></div>';
  }
  function bindFill(card, q, finish) {
    var input = card.querySelector(".fill-input");
    var btn = card.querySelector(".btn-check");
    function submit() {
      if (card.dataset.done) return; card.dataset.done = "1";
      var correct = norm(input.value) === norm(q.answer);
      input.disabled = true; btn.disabled = true;
      input.classList.add(correct ? "filled" : "wrong");
      finish(correct);
    }
    btn.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    setTimeout(function () { input.focus(); }, 50);
  }

  /* ---------- Susun kata ---------- */
  function arrangeBody(q) {
    var bank = q.tokens.map(function (t, i) {
      return '<button class="token" data-i="' + i + '">' + esc(t) + "</button>";
    }).join("");
    return '<div class="muted">Susun menjadi kalimat yang benar:</div>' +
      '<div class="q-prompt">' + esc(q.question) + "</div>" +
      '<div class="arrange-zone jp" data-empty="Klik kata di bawah\u2026"></div>' +
      '<div class="arrange-bank jp">' + bank + "</div>" +
      '<div class="quiz-actions">' +
        '<button class="btn btn-ghost btn-reset">Reset</button>' +
        '<button class="btn btn-primary btn-check">Periksa</button>' +
      "</div>";
  }
  function bindArrange(card, q, finish) {
    var zone = card.querySelector(".arrange-zone");
    var bank = card.querySelector(".arrange-bank");
    var order = [];
    function refresh() {
      zone.innerHTML = order.map(function (i) {
        return '<button class="token in-zone" data-i="' + i + '">' + esc(q.tokens[i]) + "</button>";
      }).join("");
      zone.classList.toggle("empty", order.length === 0);
      bank.querySelectorAll(".token").forEach(function (b) {
        b.classList.toggle("used", order.indexOf(parseInt(b.dataset.i, 10)) >= 0);
      });
      zone.querySelectorAll(".token").forEach(function (b) {
        b.addEventListener("click", function () {
          var idx = order.indexOf(parseInt(b.dataset.i, 10));
          if (idx >= 0) { order.splice(idx, 1); refresh(); }
        });
      });
    }
    bank.querySelectorAll(".token").forEach(function (b) {
      b.addEventListener("click", function () {
        if (card.dataset.done) return;
        var i = parseInt(b.dataset.i, 10);
        if (order.indexOf(i) < 0) { order.push(i); refresh(); }
      });
    });
    card.querySelector(".btn-reset").addEventListener("click", function () {
      if (card.dataset.done) return; order = []; refresh();
    });
    card.querySelector(".btn-check").addEventListener("click", function () {
      if (card.dataset.done) return; card.dataset.done = "1";
      var built = order.map(function (i) { return q.tokens[i]; }).join("");
      var correct = norm(built) === norm(q.answer);
      card.querySelectorAll(".token").forEach(function (b) { b.disabled = true; });
      finish(correct);
    });
    refresh();
  }

  /* ---------- Feedback ---------- */
  function showFeedback(fb, q, isCorrect, onDone, model) {
    var body = "";
    if (q.type === "mcq" && model) {
      var ci = model.correctIndex;
      var L = ci >= 0 ? String.fromCharCode(65 + ci) : "";
      var cText = ci >= 0 ? model.items[ci].text : answerText(q);
      body += '<div class="correct-ans">Jawaban benar: <b class="jp">' + (L ? L + ". " : "") + esc(cText) + "</b></div>";
      body += '<div class="q-translation-container"></div>';
      if (q.explanation) body += '<p class="fb-expl">' + esc(q.explanation) + "</p>";
      var hasWrongWhy = (q.why && q.why.length > 0) || model.items.some(function (o) { return !o.correct && o.why; });
      if (hasWrongWhy) {
        body += '<div class="why-list"><b>Rincian tiap pilihan:</b><ul class="opt-breakdown">' +
          model.items.map(function (o, idx) {
            var k = String.fromCharCode(65 + idx);
            if (o.correct) {
              return '<li class="ob-correct"><span class="ob-key">' + k + '.</span> <span class="jp">' + esc(o.text) +
                '</span> <span class="ob-tag good">\u2714 jawaban benar</span></li>';
            }
            return '<li class="ob-wrong"><span class="ob-key">' + k + '.</span> <span class="jp">' + esc(o.text) + "</span>" +
              (o.why ? ' <span class="ob-reason">\u2014 ' + esc(o.why) + "</span>" : "") +
              ' <span class="ob-tag bad">\u2716 salah</span></li>';
          }).join("") + "</ul></div>";
      }
    } else {
      if (!isCorrect) body += '<div class="correct-ans">Jawaban benar: <b class="jp">' + esc(answerText(q)) + "</b></div>";
      body += '<div class="q-translation-container"></div>';
      if (q.explanation) body += '<p class="fb-expl">' + esc(q.explanation) + "</p>";
    }
    fb.className = "feedback " + (isCorrect ? "ok" : "no");
    fb.innerHTML =
      '<div class="feedback-head">' + (isCorrect ? "\u2714 Benar!" : "\u2716 Belum tepat") + "</div>" +
      '<div class="feedback-body">' +
        body +
        '<div class="grammar-link">Grammar diuji: ' +
          '<a href="' + Data.detailLink(q.grammarId) + '" class="jp">' + esc(q.grammar) + "</a></div>" +
        '<div class="quiz-actions">' +
          '<button class="btn btn-ghost btn-listen">\u25B6 Dengar</button>' +
          '<button class="btn btn-primary btn-next">Lanjut \u2192</button>' +
        "</div>" +
      "</div>";
    
    var transContainer = fb.querySelector(".q-translation-container");
    if (transContainer) {
      translateSentence(q, transContainer);
    }

    fb.classList.remove("hidden");
    var listen = fb.querySelector(".btn-listen");
    if (listen) listen.addEventListener("click", function () { speak(speakText(q)); });
    fb.querySelector(".btn-next").addEventListener("click", function () { onDone && onDone(isCorrect, q); });
    fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* =========================================================
     Sesi kuis: kelola progres, skor, simpan, layar hasil
     ========================================================= */
  function runSession(host, questions, opts) {
    opts = opts || {};
    if (!questions.length) {
      host.innerHTML = '<div class="empty"><div class="e-ico">\u25CB</div><p>Belum ada soal untuk kriteria ini.</p></div>';
      return;
    }
    var idx = 0, correctCount = 0, wrong = [], start = Date.now();
    function next() {
      if (idx >= questions.length) return finishSession();
      var q = questions[idx];
      var bar = '<div class="progress-track"><div class="progress-fill" style="width:' +
        Math.round((idx / questions.length) * 100) + '%"></div></div>';
      host.innerHTML = '<div class="quiz-wrap">' + bar + '<div class="q-host"></div></div>';
      renderQuestion(host.querySelector(".q-host"), q, function (isCorrect) {
        if (isCorrect) correctCount++; else wrong.push(q);
        idx++; next();
      }, { progress: (idx + 1) + " / " + questions.length });
    }
    function finishSession() {
      var pct = Math.round((correctCount / questions.length) * 100);
      var dur = Math.round((Date.now() - start) / 1000);
      if (window.Store) {
        Store.addHistory({ type: "quiz", title: opts.title || "Latihan", grammarId: opts.grammarId || null,
          level: opts.level || null, score: correctCount, total: questions.length, pct: pct, duration: dur });
      }
      host.innerHTML = resultHtml(correctCount, questions.length, pct, wrong);
      
      // Populate translations for wrong answers review list
      host.querySelectorAll(".q-translation-container").forEach(function (containerEl) {
        var qIdx = parseInt(containerEl.dataset.idx, 10);
        var qObj = wrong[qIdx];
        if (qObj) {
          translateSentence(qObj, containerEl);
        }
      });

      var retry = host.querySelector(".btn-retry");
      if (retry) retry.addEventListener("click", function () {
        runSession(host, Data.shuffle(questions), opts);
      });
      var retryWrong = host.querySelector(".btn-retry-wrong");
      if (retryWrong && wrong.length) retryWrong.addEventListener("click", function () {
        runSession(host, Data.shuffle(wrong), opts);
      });
    }
    next();
  }

  function resultHtml(correct, total, pct, wrong) {
    var color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--accent)" : "var(--red)";
    var ring = '<div class="score-ring" style="background:conic-gradient(' + color + " " + pct + "%, var(--surface-2) 0)\">" +
      '<div class="inner"><span class="pct">' + pct + '%</span><span class="lbl">akurasi</span></div></div>';
    var summary = '<div class="summary-row">' +
      '<div class="s-item"><span class="v">' + correct + "</span><span class=\"k\">Benar</span></div>" +
      '<div class="s-item"><span class="v">' + (total - correct) + "</span><span class=\"k\">Salah</span></div>" +
      '<div class="s-item"><span class="v">' + total + "</span><span class=\"k\">Total</span></div>" +
      "</div>";
    var wrongList = "";
    if (wrong.length) {
      wrongList = '<div class="wrong-review"><h3>Soal yang salah</h3>' +
        wrong.map(function (q, idx) {
          return '<div class="wr-item"><div class="wr-q jp">' + esc(q.question) + "</div>" +
            '<div class="wr-line">Jawaban benar: <b class="good jp">' + esc(answerText(q)) + "</b></div>" +
            '<div class="q-translation-container" data-idx="' + idx + '"></div>' +
            '<div class="muted">' + esc(q.explanation || "") + "</div>" +
            '<a class="grammar-link jp" href="' + Data.detailLink(q.grammarId) + '">' + esc(q.grammar) + " \u2192</a></div>";
        }).join("") + "</div>";
    }
    return '<div class="result card card-pad">' +
      "<h2>Hasil Latihan</h2>" + ring + summary +
      '<div class="quiz-actions center">' +
        '<button class="btn btn-primary btn-retry">Ulangi semua</button>' +
        (wrong.length ? '<button class="btn btn-amber btn-retry-wrong">Ulangi yang salah (' + wrong.length + ")</button>" : "") +
        '<a class="btn btn-ghost" href="index.html">Ke Practice Center</a>' +
      "</div>" + wrongList + "</div>";
  }

  window.Quiz = { renderQuestion: renderQuestion, runSession: runSession, speak: speak };
})();
