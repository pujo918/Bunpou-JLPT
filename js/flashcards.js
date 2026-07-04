/* js/flashcards.js — Logika Spaced Repetition System (SRS) & UI Flashcards */
(function () {
  "use strict";

  // Interval kotak Leitner dalam satuan hari
  var BOX_INTERVALS = [0, 1, 3, 7, 14, 30, 60];

  /* ==========================================================================
     1. STORAGE WRAPPER (MANAJEMEN DATA SRS)
     ========================================================================== */
  var StoreSRS = {
    getSRS: function () {
      try {
        var raw = localStorage.getItem("jlpt_srs");
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    },
    saveSRS: function (data) {
      try {
        localStorage.setItem("jlpt_srs", JSON.stringify(data));
      } catch (e) {}
    },
    getCardSRS: function (id) {
      var srs = this.getSRS();
      return srs[id] || { box: 0, nextReview: 0, history: [] };
    },
    saveCardSRS: function (id, level, box, ease) {
      var srs = this.getSRS();
      var card = srs[id] || { box: 0, nextReview: 0, history: [] };
      
      card.box = box;
      card.level = level;
      
      var days = BOX_INTERVALS[box] || 1;
      card.nextReview = Date.now() + days * 24 * 60 * 60 * 1000;
      
      card.history = card.history || [];
      card.history.push({
        date: Date.now(),
        ease: ease,
        box: box
      });
      if (card.history.length > 50) card.history = card.history.slice(-50);
      
      srs[id] = card;
      this.saveSRS(srs);
    },
    getStats: function () {
      var srs = this.getSRS();
      var allGrammars = window.Data ? window.Data.all() : [];
      
      var stats = {
        total: allGrammars.length,
        studied: 0,
        due: 0,
        boxes: [0, 0, 0, 0, 0, 0, 0] // Indeks 0 = belum dipelajari, 1-6 = Kotak Leitner
      };
      
      var now = Date.now();
      
      allGrammars.forEach(function (g) {
        var card = srs[g.id];
        if (card && card.box > 0) {
          stats.studied++;
          stats.boxes[card.box]++;
          if (card.nextReview <= now) {
            stats.due++;
          }
        } else {
          stats.boxes[0]++; // Belum dipelajari
        }
      });
      
      return stats;
    },
    resetAll: function() {
      try {
        localStorage.removeItem("jlpt_srs");
      } catch(e) {}
    }
  };

  /* ==========================================================================
     2. STATE MANAGEMENT SESI
     ========================================================================== */
  var Session = {
    deck: [],          // Kartu dalam sesi ini
    queue: [],         // Antrean kartu aktif
    currentIdx: 0,     // Indeks aktif (1-based)
    uniqueTotal: 0,    // Total kartu unik di awal
    completedCount: 0, // Kartu unik yang selesai
    currentCard: null, // Kartu aktif
    isFlipped: false,  // Status flip kartu

    init: function (deck) {
      this.deck = deck;
      this.queue = deck.slice();
      this.uniqueTotal = deck.length;
      this.completedCount = 0;
      this.currentIdx = 1;
      this.isFlipped = false;
      this.currentCard = null;
      
      if (window.Data) {
        this.queue = window.Data.shuffle(this.queue);
      }
    },

    nextCard: function () {
      if (this.queue.length === 0) {
        this.currentCard = null;
        return null;
      }
      this.currentCard = this.queue[0];
      this.isFlipped = false;
      return this.currentCard;
    },

    handleAnswer: function (ease) {
      if (!this.currentCard) return;

      var gId = this.currentCard.id;
      var level = this.currentCard.level;
      var cardSRS = StoreSRS.getCardSRS(gId);
      var currentBox = cardSRS.box || 0;
      
      if (ease === 1) {
        // SULIT (Reset ke Kotak 1 & diulas lagi di sesi ini)
        StoreSRS.saveCardSRS(gId, level, 1, 1);
        
        var removed = this.queue.shift();
        var insertPos = Math.min(this.queue.length, 4);
        this.queue.splice(insertPos, 0, removed);
      } else {
        // LUMAYAN / MUDAH (Selesai untuk sesi ini)
        var nextBox = currentBox;
        if (ease === 2) {
          nextBox = Math.min(6, currentBox + 1);
          if (nextBox === 0) nextBox = 1;
        } else if (ease === 3) {
          nextBox = Math.min(6, currentBox + 2);
          if (nextBox === 0) nextBox = 2;
        }
        
        StoreSRS.saveCardSRS(gId, level, nextBox, ease);
        this.queue.shift();
        this.completedCount++;
        
        if (this.completedCount < this.uniqueTotal) {
          this.currentIdx = this.completedCount + 1;
        }
      }
      
      this.isFlipped = false;
    }
  };

  /* ==========================================================================
     3. RENDERING UI & EVENT HANDLERS
     ========================================================================== */
  var DOM = {
    playEl: null,
    statsEl: null,
    currentDeckName: "all",
    currentCardCount: 20,
    currentStatusFilter: "all",

    init: function () {
      this.playEl = document.getElementById("fcPlayArea");
      this.statsEl = document.getElementById("fcStatsArea");
      
      this.bindSelectorEvents();
      this.startNewSession(this.currentDeckName, this.currentCardCount, this.currentStatusFilter);
      this.renderBottomStats();
    },

    esc: function (s) {
      return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    },

    bindSelectorEvents: function () {
      var self = this;
      
      // Event listener deck selector
      var deckTabs = document.querySelectorAll("#deckSelector .fc-deck-tab");
      deckTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          deckTabs.forEach(function (t) { t.classList.remove("active"); });
          tab.classList.add("active");
          self.currentDeckName = tab.dataset.val;
          self.startNewSession(self.currentDeckName, self.currentCardCount, self.currentStatusFilter);
        });
      });

      // Event listener jumlah kartu selector
      var countTabs = document.querySelectorAll("#countSelector .count-tab");
      countTabs.forEach(function (item) {
        item.addEventListener("click", function () {
          countTabs.forEach(function (i) { i.classList.remove("active"); });
          item.classList.add("active");
          self.currentCardCount = parseInt(item.dataset.val, 10);
          self.startNewSession(self.currentDeckName, self.currentCardCount, self.currentStatusFilter);
        });
      });

      // Event listener status selector
      var statusTabs = document.querySelectorAll("#statusSelector .status-tab");
      statusTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          statusTabs.forEach(function (t) { t.classList.remove("active"); });
          tab.classList.add("active");
          self.currentStatusFilter = tab.dataset.val;
          self.startNewSession(self.currentDeckName, self.currentCardCount, self.currentStatusFilter);
        });
      });
    },

    startNewSession: function (deckName, countLimit, statusFilter) {
      if (deckName === undefined) deckName = this.currentDeckName;
      if (countLimit === undefined) countLimit = this.currentCardCount;
      if (statusFilter === undefined) statusFilter = this.currentStatusFilter;

      var allGrammars = window.Data ? window.Data.all() : [];
      var filtered = [];
      
      if (deckName === "N4") {
        filtered = allGrammars.filter(function (g) { return g.level === "N4"; });
      } else if (deckName === "N3") {
        filtered = allGrammars.filter(function (g) { return g.level === "N3"; });
      } else {
        filtered = allGrammars.slice();
      }

      // Prioritas muat kartu: 1. Due, 2. New, 3. Sisanya
      var srsData = StoreSRS.getSRS();
      var now = Date.now();
      
      var due = [];
      var newCards = [];
      var studiedNotDue = [];

      filtered.forEach(function (g) {
        var isLearned = window.Store ? (window.Store.getLearned(g.id) === "learned") : false;

        // Filter berdasarkan status dipelajari (centang selesai)
        if (statusFilter === "sudah" && !isLearned) {
          return;
        }
        if (statusFilter === "belum" && isLearned) {
          return;
        }

        var card = srsData[g.id];
        if (card && card.box > 0) {
          if (card.nextReview <= now) {
            due.push(g);
          } else {
            studiedNotDue.push(g);
          }
        } else {
          newCards.push(g);
        }
      });

      // Urutkan & campur
      due.sort(function (a, b) { return (srsData[a.id].nextReview || 0) - (srsData[b.id].nextReview || 0); });
      studiedNotDue.sort(function (a, b) { return (srsData[a.id].nextReview || 0) - (srsData[b.id].nextReview || 0); });
      if (window.Data) newCards = window.Data.shuffle(newCards);

      var finalDeck = [].concat(due, newCards, studiedNotDue);
      
      // Terapkan batasan jumlah kartu sesuai filter selector
      if (finalDeck.length > countLimit) {
        finalDeck = finalDeck.slice(0, countLimit);
      }

      if (finalDeck.length === 0) {
        var msg = "Tidak ada data materi grammar.";
        if (statusFilter === "sudah") {
          msg = "Belum ada materi " + (deckName === "all" ? "" : deckName + " ") + "yang ditandai centang selesai.";
        } else if (statusFilter === "belum") {
          msg = "Hebat! Semua materi " + (deckName === "all" ? "" : deckName + " ") + "sudah selesai dipelajari.";
        }
        this.playEl.innerHTML = '<div class="empty"><h3>Deck Kosong</h3><p>' + this.esc(msg) + '</p></div>';
        return;
      }

      Session.init(finalDeck);
      this.renderCard();
    },

    renderCard: function () {
      var card = Session.nextCard();
      if (!card) {
        this.renderCompletionScreen();
        return;
      }

      var self = this;
      var levelClass = card.level === "N3" ? "pill-n3" : "pill-n4";

      var html = 
        // Penomoran & Tag Level (sama persis dengan layout referensi)
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:13px; font-weight:600; color:var(--text-soft); padding: 0 4px;">' +
          '<div>Kartu ' + Session.currentIdx + ' / ' + Session.uniqueTotal + '</div>' +
          '<div>' + card.level + '</div>' +
        '</div>' +

        // 3D Card Container
        '<div class="fc-wrap">' +
          '<div class="fc-card" id="flashcard">' +
            
            // FRONT (Hanya menampilkan pola grammar secara bersih)
            '<div class="fc-front">' +
              '<div class="fc-level-pill pill ' + levelClass + '">' + card.level + '</div>' +
              '<div class="fc-center-content">' +
                '<div class="fc-main-text jp" style="font-size: 28px;">' + this.esc(card.grammar) + '</div>' +
              '</div>' +
              '<div class="fc-hint-text">Ketuk untuk lihat arti</div>' +
            '</div>' +

            // BACK (Hanya menampilkan arti sederhana)
            '<div class="fc-back">' +
              '<div class="fc-level-pill pill ' + levelClass + '">' + card.level + '</div>' +
              '<div class="fc-center-content">' +
                '<div class="fc-main-text" style="font-size: 20px; font-family: var(--font); color: var(--text); padding: 0 10px;">' + 
                  this.esc(card.meaning) + 
                '</div>' +
              '</div>' +
              '<div class="fc-hint-text">Ketuk untuk kembali</div>' +
            '</div>' +

          '</div>' +
        '</div>' +

        // Tombol Pilihan SRS di bagian bawah (selalu terlihat)
        '<div class="fc-actions">' +
          '<button class="fc-btn-srs srs-sulit" id="btnSrsSulit">' +
            '<span class="emoji">😵</span>' +
            '<span class="label">Sulit</span>' +
          '</button>' +
          '<button class="fc-btn-srs srs-lumayan" id="btnSrsLumayan">' +
            '<span class="emoji">🤔</span>' +
            '<span class="label">Lumayan</span>' +
          '</button>' +
          '<button class="fc-btn-srs srs-mudah" id="btnSrsMudah">' +
            '<span class="emoji">😎</span>' +
            '<span class="label">Mudah</span>' +
          '</button>' +
        '</div>';

      this.playEl.innerHTML = html;

      // Animasi slide-in kartu baru
      var newWrap = this.playEl.querySelector(".fc-wrap");
      var newActions = this.playEl.querySelector(".fc-actions");
      if (newWrap) {
        newWrap.style.transform = "translateY(28px) scale(0.96)";
        newWrap.style.opacity = "0";
        newWrap.style.transition = "none";
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            newWrap.style.transition = "transform 0.28s cubic-bezier(.2,.8,.3,1), opacity 0.25s ease";
            newWrap.style.transform = "translateY(0) scale(1)";
            newWrap.style.opacity = "1";
          });
        });
      }
      if (newActions) {
        newActions.style.opacity = "0";
        newActions.style.transition = "none";
        setTimeout(function () {
          newActions.style.transition = "opacity 0.25s ease";
          newActions.style.opacity = "1";
        }, 120);
      }

      this.bindCardEvents();
      this.updateSRSButtonsState();
    },

    updateSRSButtonsState: function () {
      var btnSulit = document.getElementById("btnSrsSulit");
      var btnLumayan = document.getElementById("btnSrsLumayan");
      var btnMudah = document.getElementById("btnSrsMudah");
      
      if (btnSulit && btnLumayan && btnMudah) {
        var disabled = !Session.isFlipped;
        btnSulit.disabled = disabled;
        btnLumayan.disabled = disabled;
        btnMudah.disabled = disabled;
      }
    },

    bindCardEvents: function () {
      var self = this;
      var cardEl = document.getElementById("flashcard");

      // Flip ketika kartu diketuk
      if (cardEl) {
        cardEl.addEventListener("click", function () {
          Session.isFlipped = !Session.isFlipped;
          cardEl.classList.toggle("flipped", Session.isFlipped);
          self.updateSRSButtonsState();
        });

        // Touch swipe: geser kiri = Sulit, geser kanan = Mudah
        var touchStartX = 0;
        var touchStartY = 0;
        var touchMoved = false;
        cardEl.addEventListener("touchstart", function (e) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchMoved = false;
        }, { passive: true });
        cardEl.addEventListener("touchmove", function (e) {
          var dx = Math.abs(e.touches[0].clientX - touchStartX);
          var dy = Math.abs(e.touches[0].clientY - touchStartY);
          if (dx > 8 || dy > 8) touchMoved = true;
        }, { passive: true });
        cardEl.addEventListener("touchend", function (e) {
          if (!touchMoved) return; // tap biasa → flip ditangani click
          var dx = e.changedTouches[0].clientX - touchStartX;
          var dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
          if (Math.abs(dx) > 60 && dy < 80 && Session.isFlipped) {
            if (dx < 0) self.submitSRSAnswer(1); // geser kiri = Sulit
            else        self.submitSRSAnswer(3); // geser kanan = Mudah
          }
        }, { passive: true });
      }

      // Handler tombol SRS
      document.getElementById("btnSrsSulit").addEventListener("click", function () {
        self.submitSRSAnswer(1);
      });
      document.getElementById("btnSrsLumayan").addEventListener("click", function () {
        self.submitSRSAnswer(2);
      });
      document.getElementById("btnSrsMudah").addEventListener("click", function () {
        self.submitSRSAnswer(3);
      });
    },

    submitSRSAnswer: function (ease) {
      if (!Session.isFlipped) return;

      var self = this;
      var wrap = this.playEl.querySelector(".fc-wrap");
      var actions = this.playEl.querySelector(".fc-actions");

      // Tentukan arah animasi: mudah = ke kanan, sulit = ke kiri, lumayan = ke atas
      var dir = ease === 3 ? 1 : (ease === 1 ? -1 : 0);
      var tx = dir !== 0 ? (dir * 80) + "px" : "0";
      var ty = dir === 0 ? "-40px" : "0";

      // Animasi slide-out
      if (wrap) {
        wrap.style.transition = "transform 0.22s cubic-bezier(.4,0,.2,1), opacity 0.22s ease";
        wrap.style.transform = "translate(" + tx + ", " + ty + ") scale(0.93)";
        wrap.style.opacity = "0";
      }
      if (actions) {
        actions.style.transition = "opacity 0.18s ease";
        actions.style.opacity = "0";
      }

      // Tunggu animasi selesai, baru render kartu berikutnya
      setTimeout(function () {
        Session.handleAnswer(ease);
        self.renderCard();
        self.renderBottomStats();
      }, 220);
    },

    renderCompletionScreen: function () {
      var self = this;
      var html = 
        '<div class="result" style="padding: 40px 20px;">' +
          '<div style="font-size: 56px; margin-bottom: 16px;">🎉</div>' +
          '<h2>Sesi Selesai!</h2>' +
          '<p class="muted">Semua kartu dalam sesi ulasan ini telah dipelajari.</p>' +
          '<p style="margin-top: 16px; font-weight: 500;">Apakah Anda ingin memulai sesi baru?</p>' +
          '<div style="margin-top: 24px; display: flex; flex-direction: column; align-items: center; gap: 10px;">' +
            '<button class="btn btn-primary" style="width: 100%; max-width: 240px;" id="btnRestartSrs">Mulai Sesi Baru (Ya)</button>' +
            '<a class="btn btn-ghost" style="width: 100%; max-width: 240px; text-decoration: none;" href="index.html">Kembali ke Menu (Tidak)</a>' +
          '</div>' +
        '</div>';
      
      this.playEl.innerHTML = html;

      document.getElementById("btnRestartSrs").addEventListener("click", function () {
        self.startNewSession(self.currentDeckName, self.currentCardCount, self.currentStatusFilter);
      });
    },

    renderBottomStats: function () {
      if (!this.statsEl) return;

      var stats = StoreSRS.getStats();
      var percents = stats.boxes.map(function (val) {
        return stats.total ? Math.round((val / stats.total) * 100) : 0;
      });

      var html = 
        '<div class="section-title"><h2>Statistik Penguasaan Hafalan</h2></div>' +
        
        '<div class="fc-stats-grid">' +
          '<div class="fc-stat-card">' +
            '<div class="val">' + stats.due + '</div>' +
            '<div class="lbl">Jatuh Tempo (Due)</div>' +
          '</div>' +
          '<div class="fc-stat-card">' +
            '<div class="val">' + stats.studied + '</div>' +
            '<div class="lbl">Sedang Dipelajari</div>' +
          '</div>' +
          '<div class="fc-stat-card">' +
            '<div class="val">' + stats.boxes[0] + '</div>' +
            '<div class="lbl">Belum Dipelajari</div>' +
          '</div>' +
          '<div class="fc-stat-card">' +
            '<div class="val">' + (stats.total ? Math.round((stats.studied / stats.total) * 100) : 0) + '%</div>' +
            '<div class="lbl">Total Progres</div>' +
          '</div>' +
        '</div>' +

        '<div class="fc-progress-box">' +
          '<div class="fc-progress-title">Tingkat Penguasaan Kartu (Leitner Boxes)</div>' +
          '<div class="fc-progress-bars">' +
            this.renderProgressBarRow("Kotak 1 (Harian)", stats.boxes[1], percents[1], "var(--red)") +
            this.renderProgressBarRow("Kotak 2 (3 Hari)", stats.boxes[2], percents[2], "var(--accent)") +
            this.renderProgressBarRow("Kotak 3 (7 Hari)", stats.boxes[3], percents[3], "#10b981") +
            this.renderProgressBarRow("Kotak 4 (14 Hari)", stats.boxes[4], percents[4], "#3b82f6") +
            this.renderProgressBarRow("Kotak 5 (30 Hari)", stats.boxes[5], percents[5], "#6366f1") +
            this.renderProgressBarRow("Kotak 6 (60 Hari)", stats.boxes[6], percents[6], "#8b5cf6") +
            this.renderProgressBarRow("Belum Dipelajari", stats.boxes[0], percents[0], "var(--text-muted)") +
          '</div>' +
          '<div style="display:flex; justify-content:flex-end; margin-top: 16px; border-top:1px solid var(--border); padding-top:12px;">' +
            '<button class="btn btn-ghost btn-sm" id="btnResetSRS" style="color:var(--red); font-size:12px; padding:4px 8px; border:none; opacity:0.75;">Reset Semua Progres</button>' +
          '</div>' +
        '</div>';

      this.statsEl.innerHTML = html;

      // Bind reset event listener
      var self = this;
      var resetBtn = document.getElementById("btnResetSRS");
      if (resetBtn) {
        resetBtn.addEventListener("click", function () {
          if (confirm("Apakah Anda yakin ingin menghapus semua data hafalan/progres flashcard? Tindakan ini tidak bisa dibatalkan.")) {
            StoreSRS.resetAll();
            if (window.Nav && window.Nav.toast) window.Nav.toast("Progres SRS telah direset");
            self.startNewSession(self.currentDeckName, self.currentCardCount);
            self.renderBottomStats();
          }
        });
      }
    },

    renderProgressBarRow: function (label, count, pct, color) {
      return (
        '<div class="fc-progress-row">' +
          '<div class="name">' + label + '</div>' +
          '<div class="track"><div class="fill" style="width:' + pct + '%; background-color:' + color + ';"></div></div>' +
          '<div class="val">' + count + '</div>' +
        '</div>'
      );
    }
  };

  // Run UI
  window.FlashcardUI = DOM;
})();
