/* nav.js — sidebar drawer + floating toggle di mobile */
(function () {
  "use strict";
  var ITEMS = [
    { href: "index.html",   label: "Practice Center",  ico: "\u25C9" },
    { href: "n4.html",      label: "Materi N4",         ico: "\u56DB" },
    { href: "n3.html",      label: "Materi N3",         ico: "\u4E09" },
    { href: "setsuzokushi.html", label: "Setsuzokushi",   ico: "\u63A5" },
    { href: "flashcards.html", label: "Flashcards",     ico: "\uD83D\uDCC7" },
    { href: "review.html",  label: "Review Kesalahan",  ico: "\u21BB", badge: true },
    { href: "bookmark.html",label: "Bookmark",          ico: "\u2605" },
    { href: "history.html", label: "Riwayat Belajar",   ico: "\u29D6" },
    { href: "stats.html",   label: "Statistik",         ico: "\u2261" },
    { href: "https://pujo918.github.io/Hyoki/", label: "Beralih: Hyoki", ico: "\u21C6", external: true }
  ];

  /* -------- Tema -------- */
  function getTheme() {
    try { var raw = localStorage.getItem("jlpt_theme"); return raw ? JSON.parse(raw) : "light"; }
    catch (e) { return "light"; }
  }
  function storeTheme(t) {
    try { localStorage.setItem("jlpt_theme", JSON.stringify(t)); } catch (e) {}
  }
  function refreshThemeBtn(t) {
    var dark = t === "dark";
    var ico = document.getElementById("ttIco");
    var txt = document.getElementById("ttText");
    if (ico) ico.textContent = dark ? "\u2600\uFE0F" : "\uD83C\uDF19";
    if (txt) txt.textContent = dark ? "Mode Terang" : "Mode Gelap";
  }
  function applyTheme(t) {
    if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    refreshThemeBtn(t);
  }
  function toggleTheme() {
    var t = getTheme() === "dark" ? "light" : "dark";
    storeTheme(t); applyTheme(t);
  }

  /* -------- Build -------- */
  function build(active) {
    var badgeN = window.Store ? window.Store.unresolvedMistakeCount() : 0;

    var nav = ITEMS.map(function (it) {
      var isActive = it.href === active ? " active" : "";
      var badge = it.badge && badgeN
        ? '<span class="badge">' + badgeN + "</span>" : "";
      var ext = it.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      return '<a class="nav-item' + isActive + '" href="' + it.href + '"' + ext + '>' +
        '<span class="ico">' + it.ico + "</span>" +
        '<span class="nav-text">' + it.label + "</span>" + badge + "</a>";
    }).join("");

    var themeBtn =
      '<button class="theme-toggle" id="themeToggle" type="button">' +
        '<span class="ico" id="ttIco"></span>' +
        '<span class="nav-text" id="ttText"></span>' +
      "</button>";

    /* Tombol × di pojok sidebar (mobile only) */
    var closeX =
      '<button id="sidebarCloseBtn" aria-label="Tutup menu" style="' +
        "display:none;position:absolute;top:14px;right:14px;" +
        "width:32px;height:32px;border-radius:50%;background:var(--surface-2);" +
        "border:none;cursor:pointer;font-size:20px;font-weight:700;" +
        "color:var(--text-soft);align-items:center;justify-content:center;" +
        "line-height:1;transition:background .15s;" +
      '">\u00D7</button>';

    var sidebarHTML =
      '<aside class="sidebar" id="sidebar">' +
        closeX +
        '<a class="brand" href="index.html">' +
          '<span class="brand-logo">\u6587</span>' +
          '<span class="brand-text"><strong>Bunpou</strong><span>JLPT N4\u2013N3</span></span>' +
        "</a>" +
        '<div class="nav-label">BELAJAR</div>' +
        '<nav class="nav-list">' + nav + "</nav>" +
        themeBtn +
        '<div id="backupSidebar" style="margin-top:auto;padding:14px 10px 4px;border-top:1px solid var(--border);"></div>' +
        '<div class="sidebar-foot" style="margin-top:0;border-top:none;">Practice First Learning</div>' +
      "</aside>";

    /* Tombol panah › mengambang pojok kanan atas (mobile only via CSS) */
    var openBtnHTML =
      '<button class="nav-open-btn" id="navOpenBtn" aria-label="Buka menu">' +
        "\u203A" +
      "</button>";

    var scrimHTML = '<div class="scrim" id="scrim"></div>';

    /* Inject ke DOM */
    document.body.insertAdjacentHTML("afterbegin", sidebarHTML + scrimHTML);
    document.body.insertAdjacentHTML("afterbegin", openBtnHTML);

    applyTheme(getTheme());

    /* Load backup script */
    var backupScript = document.createElement("script");
    backupScript.src = "js/backup.js";
    document.body.appendChild(backupScript);

    /* Theme toggle */
    var tt = document.getElementById("themeToggle");
    if (tt) tt.addEventListener("click", toggleTheme);

    /* Sidebar open/close */
    var sb      = document.getElementById("sidebar");
    var sc      = document.getElementById("scrim");
    var openBtn = document.getElementById("navOpenBtn");
    var closeBtn= document.getElementById("sidebarCloseBtn");

    function openSidebar() {
      sb.classList.add("open");
      sc.classList.add("show");
      /* sembunyikan tombol buka saat sidebar terbuka */
      if (openBtn) { openBtn.style.opacity = "0"; openBtn.style.pointerEvents = "none"; }
    }
    function closeSidebar() {
      sb.classList.remove("open");
      sc.classList.remove("show");
      if (openBtn) { openBtn.style.opacity = ""; openBtn.style.pointerEvents = ""; }
    }

    if (openBtn)  openBtn.addEventListener("click", openSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (sc)       sc.addEventListener("click", closeSidebar);

    /* Auto-close saat navigasi di mobile */
    if (sb) {
      sb.querySelectorAll(".nav-item").forEach(function (link) {
        link.addEventListener("click", function () {
          if (window.innerWidth <= 860) closeSidebar();
        });
      });
    }

    /* Tampilkan × dan sesuaikan open-btn berdasarkan lebar layar */
    function updateMobileUI() {
      var mobile = window.innerWidth <= 860;
      if (closeBtn) closeBtn.style.display = mobile ? "flex" : "none";
    }
    updateMobileUI();
    window.addEventListener("resize", updateMobileUI);
  }

  /* -------- Toast -------- */
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.remove(); }, 300);
    }, 2200);
  }

  window.Nav = { build: build, toast: toast, toggleTheme: toggleTheme };
})();
