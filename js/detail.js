/* detail.js — render halaman detail grammar (bagian terpenting) */
(function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&]+)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function diffText(n) { return n === 1 ? "Mudah" : n === 2 ? "Sedang" : "Sulit"; }

  function exampleHTML(e, i) {
    var tag = e.type === "jlpt" ? '<span class="ex-tag jlpt">JLPT Style</span>' : '<span class="ex-tag simple">Sederhana</span>';
    return '<div class="example">' +
      '<div class="ex-jp jp">' + esc(e.jp) + "</div>" +
      '<div class="ex-furi">' + esc(e.furigana) + "</div>" +
      '<div class="ex-id">' + esc(e.id) + "</div>" +
      '<div class="ex-foot">' +
        '<button class="play-btn" data-jp="' + esc(e.jp) + '">&#x1F50A; Dengarkan</button>' +
        tag +
      "</div>" +
    "</div>";
  }

  function compareHTML(c) {
    return '<div class="compare-card">' +
      '<div class="vs-tag">vs</div>' +
      "<h4>" + esc(c.grammar) + "</h4>" +
      "<p>" + esc(c.note) + "</p>" +
    "</div>";
  }

  function render(g) {
    var host = document.getElementById("detail");
    var booked = Store.isGrammarBookmarked(g.id);
    var note = Store.getNote(g.id) || "";

    var html = '<a class="btn btn-ghost btn-sm" href="' + (g.level === "N4" ? "n4.html" : "n3.html") + '">&#x2190; Kembali ke ' + g.level + "</a>";

    html += '<div class="detail-hero mt-16">' +
      '<div class="jp-big">' + esc(g.grammar) + "</div>" +
      '<div class="mean">' + esc(g.meaning) + "</div>" +
      '<div class="hero-meta">' +
        '<span class="pill">' + g.level + "</span>" +
        '<span class="pill">' + esc(g.romaji) + "</span>" +
        '<span class="pill">Kesulitan: ' + diffText(g.difficulty) + "</span>" +
      "</div>" +
    "</div>";

    html += '<div class="section-title"><h2>Materi Grammar</h2>' +
      '<button class="bookmark-btn ' + (booked ? "on" : "") + '" id="bm" title="Bookmark grammar">' + (booked ? "&#x2605;" : "&#x2606;") + "</button></div>";

    html += '<div class="section"><h2><span class="num">1</span>Arti</h2><div class="prose"><p>' + esc(g.meaning) + "</p></div></div>";
    html += '<div class="section"><h2><span class="num">2</span>Rumus</h2><div class="formula-box">' + esc(g.formula) + "</div></div>";
    html += '<div class="section"><h2><span class="num">3</span>Penjelasan Lengkap</h2><div class="prose"><p>' + esc(g.explanation) + "</p></div></div>";
    html += '<div class="section"><h2><span class="num">4</span>Nuansa</h2><div class="prose"><p>' + esc(g.nuance) + "</p></div></div>";
    html += '<div class="section"><h2><span class="num">5</span>Kapan Digunakan</h2><div class="callout do"><span class="c-ico">&#x2705;</span><div><strong>Gunakan saat…</strong><p>' + esc(g.whenUse) + "</p></div></div></div>";
    html += '<div class="section"><h2><span class="num">6</span>Kapan TIDAK Boleh Digunakan</h2><div class="callout dont"><span class="c-ico">&#x26D4;</span><div><strong>Hindari saat…</strong><p>' + esc(g.whenNotUse) + "</p></div></div></div>";

    var mistakes = (g.mistakes || []).map(function (m) { return "<p>&#x2022; " + esc(m) + "</p>"; }).join("");
    html += '<div class="section"><h2><span class="num">7</span>Kesalahan Umum Pembelajar Indonesia</h2><div class="callout warn"><span class="c-ico">&#x26A0;&#xFE0F;</span><div><strong>Perhatikan</strong>' + mistakes + "</div></div></div>";

    var comps = (g.comparisons || []).map(compareHTML).join("");
    html += '<div class="section"><h2><span class="num">8</span>Perbandingan dengan Grammar Mirip</h2><div class="two-col">' + comps + "</div></div>";

    var simple = (g.examples || []).filter(function (e) { return e.type !== "jlpt"; });
    var jlpt = (g.examples || []).filter(function (e) { return e.type === "jlpt"; });
    html += '<div class="section"><h2>Contoh Kalimat</h2>' +
      '<h4 class="muted" style="margin:6px 0 10px">Sederhana</h4>' + simple.map(exampleHTML).join("") +
      '<h4 class="muted" style="margin:18px 0 10px">Gaya JLPT</h4>' + jlpt.map(exampleHTML).join("") +
    "</div>";

    html += '<div class="section"><h2>Catatan Pribadi</h2>' +
      '<textarea class="notes-area" id="note" placeholder="Tulis catatanmu tentang grammar ini\u2026">' + esc(note) + "</textarea>" +
      '<div class="notes-foot"><span id="noteStatus">Tersimpan otomatis di perangkat ini.</span></div>' +
    "</div>";

    html += '<div class="section"><div class="section-title"><h2>Latihan Grammar Ini</h2></div>' +
      '<div id="practiceHost"><button class="btn btn-primary btn-block" id="startPractice">Mulai Latihan (' + Data.countQuestions(g).total + ' soal)</button></div>' +
    "</div>";

    host.innerHTML = html;

    // Bookmark
    document.getElementById("bm").addEventListener("click", function () {
      var on = Store.toggleGrammarBookmark(g.id);
      this.classList.toggle("on", on);
      this.innerHTML = on ? "&#x2605;" : "&#x2606;";
      Nav.toast(on ? "Ditambahkan ke bookmark" : "Dihapus dari bookmark");
    });

    // Play buttons
    host.querySelectorAll(".play-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        host.querySelectorAll(".play-btn.playing").forEach(function (x) { x.classList.remove("playing"); });
        b.classList.add("playing");
        Quiz.speak(b.dataset.jp);
        setTimeout(function () { b.classList.remove("playing"); }, 1600);
      });
    });

    // Notes autosave
    var noteEl = document.getElementById("note");
    var statusEl = document.getElementById("noteStatus");
    var t;
    noteEl.addEventListener("input", function () {
      clearTimeout(t);
      statusEl.textContent = "Menyimpan\u2026";
      t = setTimeout(function () {
        Store.setNote(g.id, noteEl.value);
        statusEl.textContent = "Tersimpan \u2713";
      }, 500);
    });

    // Practice
    document.getElementById("startPractice").addEventListener("click", function () {
      var ph = document.getElementById("practiceHost");
      var questions = Data.buildQuestions(g);
      Quiz.runSession(ph, questions, { title: "Latihan " + g.grammar, grammarId: g.id, level: g.level });
    });

    // Tandai sebagai sedang dipelajari + simpan terakhir dibuka
    if (Store.getLearned(g.id) === "none") Store.setLearned(g.id, "learning");
    Store.setLast(g.id);
    Store.addHistory({ type: "study", grammarId: g.id, grammar: g.grammar, level: g.level });
  }

  window.renderDetail = function () {
    Nav.build("");
    var id = qs("id");
    var g = id ? Data.byId(id) : null;
    var host = document.getElementById("detail");
    if (!g) {
      host.innerHTML = '<div class="empty"><div class="e-ico">&#x1F4DA;</div><h3>Grammar tidak ditemukan</h3><p>Pilih grammar dari daftar materi.</p><a class="btn btn-primary" href="n4.html">Lihat Materi N4</a></div>';
      return;
    }
    render(g);
  };
})();
