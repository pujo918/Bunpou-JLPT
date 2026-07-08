(function () {
  "use strict";

  // Leitner SRS Box intervals
  var BOX_INTERVALS = [0, 1, 3, 7, 14, 30, 60];

  var StoreSRS = {
    getSRS: function () {
      try {
        var raw = localStorage.getItem("jlpt_srs");
        return raw ? JSON.parse(raw) : {};
      } catch (e) { return {}; }
    },
    saveSRS: function (data) {
      try { localStorage.setItem("jlpt_srs", JSON.stringify(data)); } catch (e) {}
    },
    getCardSRS: function (id) {
      var srs = this.getSRS();
      return srs[id] || { box: 0, nextReview: 0, history: [] };
    },
    saveCardSRS: function (id, type, box, ease) {
      var srs = this.getSRS();
      var card = srs[id] || { box: 0, nextReview: 0, history: [] };
      card.box = box;
      card.type = type;
      var days = BOX_INTERVALS[box] || 1;
      card.nextReview = Date.now() + days * 24 * 60 * 60 * 1000;
      card.history = card.history || [];
      card.history.push({ date: Date.now(), ease: ease, box: box });
      if (card.history.length > 50) card.history = card.history.slice(-50);
      srs[id] = card;
      this.saveSRS(srs);
    }
  };

  var Session = {
    deck: [],
    queue: [],
    currentIdx: 0,
    uniqueTotal: 0,
    completedCount: 0,
    currentCard: null,
    isFlipped: false,

    init: function (deck) {
      this.deck = deck;
      this.queue = deck.slice();
      this.uniqueTotal = deck.length;
      this.completedCount = 0;
      this.currentIdx = 1;
      this.isFlipped = false;
      this.currentCard = null;
      
      // Simple shuffle
      var q = this.queue;
      for (var i = q.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = q[i]; q[i] = q[j]; q[j] = temp;
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
      var cardId = this.currentCard.id;
      var type = this.currentCard.type;
      var cardSRS = StoreSRS.getCardSRS(cardId);
      var currentBox = cardSRS.box || 0;
      
      if (ease === 1) {
        StoreSRS.saveCardSRS(cardId, type, 1, 1);
        var removed = this.queue.shift();
        var insertPos = Math.min(this.queue.length, 4);
        this.queue.splice(insertPos, 0, removed);
      } else {
        var nextBox = currentBox;
        if (ease === 2) {
          nextBox = Math.min(6, currentBox + 1);
          if (nextBox === 0) nextBox = 1;
        } else if (ease === 3) {
          nextBox = Math.min(6, currentBox + 2);
          if (nextBox === 0) nextBox = 2;
        }
        StoreSRS.saveCardSRS(cardId, type, nextBox, ease);
        this.queue.shift();
        this.completedCount++;
        if (this.completedCount < this.uniqueTotal) {
          this.currentIdx = this.completedCount + 1;
        }
      }
      this.isFlipped = false;
    }
  };

  var DOM = {
    playEl: null,
    currentDeckName: "all",
    currentCardCount: 20,

    init: function () {
      this.playEl = document.getElementById("fcPlayArea");
      this.bindSelectorEvents();
      this.startNewSession(this.currentDeckName, this.currentCardCount);
    },

    esc: function (s) {
      return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    },

    bindSelectorEvents: function () {
      var self = this;
      
      var deckTabs = document.querySelectorAll("#deckSelector .fc-deck-tab");
      deckTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          deckTabs.forEach(function (t) { t.classList.remove("active"); });
          tab.classList.add("active");
          self.currentDeckName = tab.dataset.val;
          self.startNewSession(self.currentDeckName, self.currentCardCount);
        });
      });

      var countTabs = document.querySelectorAll("#countSelector .fc-deck-tab");
      countTabs.forEach(function (item) {
        item.addEventListener("click", function () {
          countTabs.forEach(function (i) { i.classList.remove("active"); });
          item.classList.add("active");
          self.currentCardCount = parseInt(item.dataset.val, 10);
          self.startNewSession(self.currentDeckName, self.currentCardCount);
        });
      });
    },

    startNewSession: function (deckName, countLimit) {
      var pool = [];

      if (deckName === "all" || deckName === "setsuzokushi") {
        var sData = (window.SETSUZOKUSHI_DATA || []).map(function (s, idx) {
          return {
            id: s.id || ("setsuzoku-" + idx),
            type: "setsuzokushi",
            category: s.category || "Kata Hubung",
            word: s.setsuzokushi,
            romaji: s.romaji || "",
            arti: s.arti,
            nuansa: s.nuansa,
            perbedaan: s.perbedaan
          };
        });
        pool = pool.concat(sData);
      }

      if (deckName === "all" || deckName === "onomatope") {
        var oData = (window.ONOMATOPE_DATA || []).map(function (o, idx) {
          return {
            id: o.id || ("onomatope-" + idx),
            type: "onomatope",
            category: "Onomatope",
            word: o.onomatope,
            romaji: o.romaji || "",
            arti: o.arti,
            nuansa: o.nuansa,
            perbedaan: o.perbedaan
          };
        });
        pool = pool.concat(oData);
      }

      // Prioritize due/new cards from SRS
      var srsData = StoreSRS.getSRS();
      var now = Date.now();
      var due = [], newCards = [], studiedNotDue = [];

      pool.forEach(function (c) {
        var card = srsData[c.id];
        if (card && card.box > 0) {
          if (card.nextReview <= now) due.push(c);
          else studiedNotDue.push(c);
        } else {
          newCards.push(c);
        }
      });

      // Shuffle
      var shuffleArray = function(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
        }
        return arr;
      };
      
      due = shuffleArray(due);
      newCards = shuffleArray(newCards);
      studiedNotDue = shuffleArray(studiedNotDue);

      var finalDeck = [].concat(due, newCards, studiedNotDue);
      if (finalDeck.length > countLimit) {
        finalDeck = finalDeck.slice(0, countLimit);
      }

      if (finalDeck.length === 0) {
        this.playEl.innerHTML = '<div class="empty"><h3>Deck Kosong</h3><p>Tidak ada data materi.</p></div>';
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
      var typeClass = card.type === "setsuzokushi" ? "pill-n3" : "pill-type";

      // Onomatopoeia examples formatting
      var detailHtml = "";
      if (card.type === "onomatope" && card.perbedaan) {
        var valHtml = this.esc(card.perbedaan);
        if (card.perbedaan.indexOf(" / ") >= 0) {
          var parts = card.perbedaan.split(" / ");
          valHtml = parts.map(function (p) {
            var match = p.match(/^([^(]+)\(([^)]+)\)$/);
            if (match) {
              return '<div class="ex-item" style="margin-bottom: 8px; line-height: 1.4;">' +
                '<div class="jp" style="font-size: 14.5px; font-weight: 600; color: var(--text);">' + self.esc(match[1].trim()) + '</div>' +
                '<div style="font-size: 12.5px; color: var(--text-soft); margin-top: 1px;">(' + self.esc(match[2].trim()) + ')</div>' +
                '</div>';
            }
            return '<div style="margin-bottom: 8px;">' + self.esc(p) + '</div>';
          }).join("");
        } else {
          var match = card.perbedaan.match(/^([^(]+)\(([^)]+)\)$/);
          if (match) {
            valHtml = '<div class="ex-item" style="line-height: 1.4;">' +
              '<div class="jp" style="font-size: 14.5px; font-weight: 600; color: var(--text);">' + self.esc(match[1].trim()) + '</div>' +
              '<div style="font-size: 12.5px; color: var(--text-soft); margin-top: 1px;">(' + self.esc(match[2].trim()) + ')</div>' +
              '</div>';
          }
        }
        detailHtml = '<div style="border-top: 1px solid var(--border); padding-top: 8px; margin-top: 6px;">' +
          '<strong style="font-size: 12px; color: var(--text-soft); display: block; margin-bottom: 4px;">Contoh Penggunaan:</strong>' +
          '<div>' + valHtml + '</div>' +
          '</div>';
      } else if (card.type === "setsuzokushi" && card.perbedaan) {
        detailHtml = '<div style="border-top: 1px solid var(--border); padding-top: 8px; margin-top: 6px;">' +
          '<strong style="font-size: 12px; color: var(--text-soft); display: block; margin-bottom: 2px;">Catatan Perbandingan:</strong>' +
          '<div style="font-size: 12.5px; color: var(--text-soft); line-height: 1.4;">' + this.esc(card.perbedaan) + '</div>' +
          '</div>';
      }

      var html = 
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:13px; font-weight:600; color:var(--text-soft); padding: 0 4px; width:100%;">' +
          '<div>Kartu ' + Session.currentIdx + ' / ' + Session.uniqueTotal + '</div>' +
          '<div>' + card.category + '</div>' +
        '</div>' +

        '<div class="fc-wrap" style="width: 100%; max-width: 500px; height: 380px; margin-bottom: 20px;">' +
          '<div class="fc-card" id="flashcard" style="height: 100%;">' +
            
            // FRONT
            '<div class="fc-front" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; box-sizing: border-box; height: 100%;">' +
              '<div class="pill ' + typeClass + '">' + card.category + '</div>' +
              '<div class="fc-center-content">' +
                '<div class="jp" style="font-size: 34px; font-weight: 800; color: var(--primary);">' + this.esc(card.word) + '</div>' +
                '<div style="font-size: 14px; color: var(--text-soft); margin-top: 6px;">' + this.esc(card.romaji) + '</div>' +
              '</div>' +
              '<div class="fc-hint-text">Ketuk untuk lihat arti & detail</div>' +
            '</div>' +

            // BACK
            '<div class="fc-back" style="padding: 20px; text-align: left; display: flex; flex-direction: column; box-sizing: border-box; height: 100%;">' +
              '<div style="font-size: 18px; font-weight: 800; border-bottom: 1px solid var(--border); padding-bottom: 4px; margin-bottom: 8px; color: var(--primary);" class="jp">' + this.esc(card.word) + '</div>' +
              '<div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">' +
                '<div><strong>Arti:</strong> <span style="color: var(--text);">' + this.esc(card.arti) + '</span></div>' +
                '<div><strong>Nuansa:</strong> <span style="font-size: 12.5px; color: var(--text-soft);">' + this.esc(card.nuansa) + '</span></div>' +
                detailHtml +
              '</div>' +
              '<div class="fc-hint-text" style="margin-top: 6px;">Ketuk untuk kembali</div>' +
            '</div>' +

          '</div>' +
        '</div>' +

        '<div class="fc-actions" style="width: 100%; max-width: 500px; display: flex; gap: 12px; justify-content: center;">' +
          '<button class="fc-btn-srs srs-sulit" id="btnSrsSulit" disabled>' +
            '<span class="emoji">😵</span>' +
            '<span class="label">Sulit</span>' +
          '</button>' +
          '<button class="fc-btn-srs srs-lumayan" id="btnSrsLumayan" disabled>' +
            '<span class="emoji">🤔</span>' +
            '<span class="label">Lumayan</span>' +
          '</button>' +
          '<button class="fc-btn-srs srs-mudah" id="btnSrsMudah" disabled>' +
            '<span class="emoji">😎</span>' +
            '<span class="label">Mudah</span>' +
          '</button>' +
        '</div>';

      this.playEl.innerHTML = html;

      // Card flip logic
      var fcCard = document.getElementById("flashcard");
      if (fcCard) {
        fcCard.addEventListener("click", function () {
          Session.isFlipped = !Session.isFlipped;
          fcCard.classList.toggle("flipped", Session.isFlipped);
          self.updateSRSButtonsState();
        });
      }

      // Bind SRS actions
      document.getElementById("btnSrsSulit").addEventListener("click", function () {
        Session.handleAnswer(1);
        if (window.Store && window.Store.incrementDailyQuestProgress) {
          window.Store.incrementDailyQuestProgress("setsuzoku_fc", 1);
        }
        self.renderCard();
      });
      document.getElementById("btnSrsLumayan").addEventListener("click", function () {
        Session.handleAnswer(2);
        if (window.Store && window.Store.incrementDailyQuestProgress) {
          window.Store.incrementDailyQuestProgress("setsuzoku_fc", 1);
        }
        self.renderCard();
      });
      document.getElementById("btnSrsMudah").addEventListener("click", function () {
        Session.handleAnswer(3);
        if (window.Store && window.Store.incrementDailyQuestProgress) {
          window.Store.incrementDailyQuestProgress("setsuzoku_fc", 1);
        }
        self.renderCard();
      });
    },

    updateSRSButtonsState: function () {
      var btnSulit = document.getElementById("btnSrsSulit");
      var btnLumayan = document.getElementById("btnSrsLumayan");
      var btnMudah = document.getElementById("btnSrsMudah");
      if (btnSulit && btnLumayan && btnMudah) {
        btnSulit.disabled = !Session.isFlipped;
        btnLumayan.disabled = !Session.isFlipped;
        btnMudah.disabled = !Session.isFlipped;
      }
    },

    renderCompletionScreen: function () {
      var self = this;
      this.playEl.innerHTML = 
        '<div class="empty" style="text-align: center; padding: 40px 10px;">' +
          '<div style="font-size: 48px; margin-bottom: 16px;">🎉</div>' +
          '<h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Misi Selesai!</h3>' +
          '<p style="color: var(--text-soft); font-size: 14px; margin-bottom: 20px;">Semua kartu Setsuzoku & Onomatope telah diulas.</p>' +
          '<button class="btn btn-primary" id="btnRestartDeck" style="padding: 10px 24px;">Mulai Ulang</button>' +
        '</div>';

      document.getElementById("btnRestartDeck").addEventListener("click", function () {
        self.startNewSession(self.currentDeckName, self.currentCardCount);
      });
    }
  };

  window.SetsuzokuFlashcardUI = DOM;
})();
