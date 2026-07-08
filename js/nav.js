/* nav.js — sidebar drawer + floating toggle di mobile */
(function () {
  "use strict";
  var ITEMS = [
    { href: "index.html",   label: "Practice Center",  ico: "\u25C9" },
    {
      label: "Materi JLPT",
      ico: "\u6587",
      id: "jlpt-materi-parent",
      children: [
        { href: "n4.html",      label: "Materi N4",         ico: "\u56DB" },
        { href: "n3.html",      label: "Materi N3",         ico: "\u4E09" },
        { href: "flashcards.html", label: "Flashcards",       ico: "\u2022" }
      ]
    },
    {
      label: "Setsuzoku & Onomatope",
      ico: "\u63A5",
      id: "setsuzoku-onomatope-parent",
      children: [
        { href: "setsuzokushi.html", label: "Setsuzokushi", ico: "\u2022" },
        { href: "onomatope.html", label: "Onomatope", ico: "\u2022" },
        { href: "setsuzoku-flashcards.html", label: "Flashcards", ico: "\u2022" }
      ]
    },
    { href: "review.html",  label: "Review Kesalahan",  ico: "\u21BB", badge: true },
    { href: "bookmark.html",label: "Bookmark",          ico: "\u2605" },
    { href: "history.html", label: "Riwayat Belajar",   ico: "\u29D6" },
    { href: "stats.html",   label: "Statistik",         ico: "\u2261" }
  ];

  /* -------- Tema -------- */
  var themeBtn = ""; // placeholder declaration or handled inside build
  function getTheme() {
    try { var raw = localStorage.getItem("jlpt_theme"); return raw ? JSON.parse(raw) : "light"; }
    catch (e) { return "light"; }
  }
  function storeTheme(t) {
    try { localStorage.setItem("jlpt_theme", JSON.stringify(t)); } catch (e) {}
  }
  function refreshThemeBtn(t) {
    var ttIco = document.getElementById("ttIco");
    var ttText = document.getElementById("ttText");
    if (!ttIco || !ttText) return;
    if (t === "dark") {
      ttIco.innerHTML = "&#x2600;&#xFE0F;"; // Sun emoji
      ttText.textContent = "Mode Terang";
    } else {
      ttIco.innerHTML = "&#x1F319;"; // Moon emoji
      ttText.textContent = "Mode Gelap";
    }
  }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    refreshThemeBtn(t);
  }
  function toggleTheme() {
    var t = getTheme() === "dark" ? "light" : "dark";
    storeTheme(t); applyTheme(t);
  }

  /* -------- Furigana -------- */
  function getFuriState() {
    try {
      var raw = localStorage.getItem("jlpt_show_furi");
      return raw == null ? true : JSON.parse(raw);
    } catch (e) { return true; }
  }
  function setFuriState(val) {
    try { localStorage.setItem("jlpt_show_furi", JSON.stringify(val)); } catch (e) {}
  }
  function refreshFuriBtn(show) {
    var ftText = document.getElementById("ftText");
    if (ftText) {
      ftText.textContent = "Furigana: " + (show ? "Tampil" : "Sembunyi");
    }
  }
  function applyFuri(show) {
    refreshFuriBtn(show);
    document.querySelectorAll(".ex-furi").forEach(function (f) {
      f.style.display = show ? "block" : "none";
    });
  }
  function toggleFuri() {
    var show = !getFuriState();
    setFuriState(show);
    applyFuri(show);
  }

  /* -------- Build -------- */
  function build(active) {
    var loc = window.location.pathname.split("/").pop() || active || "index.html";

    var badgeN = window.Store ? window.Store.unresolvedMistakeCount() : 0;

    var nav = ITEMS.map(function (it) {
      if (it.children) {
        var isAnyChildActive = it.children.some(function (c) { return c.href === loc; });
        var parentExpandedClass = isAnyChildActive ? " expanded" : "";
        var subListShowClass = isAnyChildActive ? " show" : "";
        
        var childrenHtml = it.children.map(function (c) {
          var isChildActive = c.href === loc ? " active" : "";
          return '<a class="nav-sub-item' + isChildActive + '" href="' + c.href + '">' +
            '<span class="ico">' + c.ico + '</span>' +
            '<span class="nav-text">' + c.label + '</span></a>';
        }).join("");

        return '<div class="nav-parent-group">' +
          '<div class="nav-item nav-parent' + parentExpandedClass + '" id="' + it.id + '">' +
            '<span class="ico">' + it.ico + '</span>' +
            '<span class="nav-text">' + it.label + '</span>' +
            '<span class="arrow">&#x25B8;</span>' +
          '</div>' +
          '<div class="nav-sub-list' + subListShowClass + '">' + childrenHtml + '</div>' +
        '</div>';
      }

      var isActive = it.href === loc ? " active" : "";
      var badge = it.badge && badgeN
        ? '<span class="badge">' + badgeN + "</span>" : "";
      var ext = it.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      return '<a class="nav-item' + isActive + '" href="' + it.href + '"' + ext + '>' +
        '<span class="ico">' + it.ico + "</span>" +
        '<span class="nav-text">' + it.label + "</span>" + badge + "</a>";
    }).join("");

    var furiBtnHtml =
      '<button class="theme-toggle" id="furiToggle" type="button" style="margin-top:auto; margin-bottom:2px;">' +
        '<span class="ico" id="ftIco" style="font-family:var(--font-jp); font-weight:800; font-size:14px;">あ</span>' +
        '<span class="nav-text" id="ftText">Furigana: Tampil</span>' +
      "</button>";

    var themeBtnHtml =
      '<button class="theme-toggle" id="themeToggle" type="button" style="margin-top:0;">' +
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
        furiBtnHtml +
        themeBtnHtml +
        '<div id="backupSidebar" style="padding:14px 10px 4px;border-top:1px solid var(--border);"></div>' +
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
    applyFuri(getFuriState());

    /* Load backup script */
    var backupScript = document.createElement("script");
    backupScript.src = "js/backup.js";
    document.body.appendChild(backupScript);

    // Toggle sub-menus
    document.querySelectorAll(".nav-parent").forEach(function (parent) {
      parent.addEventListener("click", function () {
        var group = parent.parentElement;
        var subList = group.querySelector(".nav-sub-list");
        var isExpanded = parent.classList.contains("expanded");
        if (isExpanded) {
          parent.classList.remove("expanded");
          subList.classList.remove("show");
        } else {
          parent.classList.add("expanded");
          subList.classList.add("show");
        }
      });
    });

    /* Theme toggle */
    var tt = document.getElementById("themeToggle");
    if (tt) tt.addEventListener("click", toggleTheme);

    /* Furigana toggle */
    var ft = document.getElementById("furiToggle");
    if (ft) ft.addEventListener("click", toggleFuri);

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
      sb.querySelectorAll(".nav-item, .nav-sub-item").forEach(function (link) {
        link.addEventListener("click", function () {
          if (link.classList.contains("nav-parent")) return;
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

  window.Nav = { build: build, toast: toast, toggleTheme: toggleTheme, getFuriState: getFuriState, applyFuri: applyFuri };

  /* PWA Service Worker Registration */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        console.log("Service Worker registered successfully:", reg.scope);
      }).catch(function (err) {
        console.log("Service Worker registration failed:", err);
      });
    });
  }
})();
