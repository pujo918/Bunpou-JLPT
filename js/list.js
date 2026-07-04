/* list.js — render daftar grammar untuk halaman level (N4/N3) */
function renderLevelList(level, page) {
  Nav.build(page);
  var listEl = document.getElementById("list");
  var searchEl = document.getElementById("search");
  var state = { q: "", difficulty: "all", status: "all", level: level };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function diffDots(n) {
    var s = "";
    for (var i = 1; i <= 3; i++) s += '<i class="' + (i <= n ? "on" : "") + '"></i>';
    return '<span class="diff" title="Tingkat kesulitan">' + s + "</span>";
  }
  function statusLabel(st) {
    return st === "learned" ? "Selesai" : st === "learning" ? "Dipelajari" : "Baru";
  }

  function render() {
    var rows = Data.search(Data.byLevel(level), state.q, state);
    if (!rows.length) {
      listEl.innerHTML = '<div class="empty"><div class="e-ico">&#x1F50D;</div><h3>Tidak ada hasil</h3><p>Coba ubah kata kunci atau filter.</p></div>';
      return;
    }
    listEl.innerHTML = rows.map(function (g) {
      var cnt = Data.countQuestions(g);
      var st = Store.getLearned(g.id);
      return '<a class="g-card" href="' + Data.detailLink(g.id) + '">' +
        '<div class="g-main">' +
          '<div class="g-title">' + esc(g.grammar) + "</div>" +
          '<div class="g-meaning">' + esc(g.meaning) + "</div>" +
        "</div>" +
        '<div class="g-meta">' +
          diffDots(g.difficulty) +
          '<span class="chip">' + cnt.total + ' soal</span>' +
          '<span class="done-check ' + (st !== "none" ? st : "") + '" data-id="' + g.id + '" role="button" tabindex="0" title="' + statusLabel(st) + '" aria-label="Tandai sudah dipahami"><span class="ck">\u2713</span></span>' +
        "</div>" +
      "</a>";
    }).join("");
  }

  searchEl.addEventListener("input", function () { state.q = searchEl.value; render(); });
  document.querySelectorAll("#diffFilter button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("#diffFilter button").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active"); state.difficulty = b.dataset.d; render();
    });
  });
  document.querySelectorAll("#statusFilter button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("#statusFilter button").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active"); state.status = b.dataset.s; render();
    });
  });

  listEl.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".done-check") : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var id = btn.getAttribute("data-id");
    var cur = Store.getLearned(id);
    if (cur === "learned") {
      Store.setLearned(id, "learning");
      btn.classList.remove("learned"); btn.classList.add("learning");
      btn.setAttribute("title", "Dipelajari");
      Nav.toast("Tanda selesai dilepas");
    } else {
      Store.setLearned(id, "learned");
      btn.classList.remove("learning"); btn.classList.add("learned");
      btn.setAttribute("title", "Selesai");
      Nav.toast("Ditandai selesai \u2713");
    }
  });

  render();
}
