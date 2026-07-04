/* js/backup.js — Fitur Ekspor & Impor Cadangan Progres Belajar (JSON) */
(function () {
  "use strict";

  var P = "jlpt_";

  function exportData() {
    var data = {};
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      // Salin semua key dengan prefix jlpt_ kecuali preferensi tema
      if (key && key.indexOf(P) === 0 && key !== P + "theme") {
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          data[key] = localStorage.getItem(key);
        }
      }
    }

    var jsonStr = JSON.stringify(data, null, 2);
    var blob = new Blob([jsonStr], { type: "application/json" });
    var url = URL.createObjectURL(blob);

    var now = new Date();
    var dateStr = now.getFullYear() + "-" + 
                  String(now.getMonth() + 1).padStart(2, '0') + "-" + 
                  String(now.getDate()).padStart(2, '0');

    var a = document.createElement("a");
    a.href = url;
    a.download = "jlpt_backup_" + dateStr + ".json";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.Nav && window.Nav.toast) {
      window.Nav.toast("Cadangan berhasil diunduh \u2713");
    }
  }

  function importData(file) {
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);

        // Validasi struktur data cadangan
        if (typeof data !== "object" || data === null || Array.isArray(data)) {
          throw new Error("Format data cadangan tidak valid.");
        }

        var keys = Object.keys(data);
        if (keys.length === 0) {
          throw new Error("File cadangan kosong.");
        }

        var hasValidKeys = keys.every(function (k) {
          return k.indexOf(P) === 0;
        });

        if (!hasValidKeys) {
          throw new Error("File ini bukan berkas cadangan JLPT Bunpou.");
        }

        // --- PROSES MERGE (PENGGABUNGAN DATA) ---
        keys.forEach(function (k) {
          var cloudVal = data[k];
          var localValRaw = localStorage.getItem(k);

          if (!localValRaw) {
            // Jika lokal tidak punya data ini, langsung pakai data cadangan
            localStorage.setItem(k, typeof cloudVal === "string" ? cloudVal : JSON.stringify(cloudVal));
            return;
          }

          var localVal = JSON.parse(localValRaw);

          // Gabungkan berdasarkan tipe data
          if (k === P + "learned") {
            // Gabungkan status belajar (learned / learning / none)
            // Prioritas: learned > learning > none
            var mergedLearned = {};
            Object.keys(localVal).forEach(function (id) {
              mergedLearned[id] = localVal[id];
            });
            Object.keys(cloudVal).forEach(function (id) {
              var localStatus = mergedLearned[id] || "none";
              var cloudStatus = cloudVal[id] || "none";
              if (cloudStatus === "learned" || localStatus === "learned") {
                mergedLearned[id] = "learned";
              } else if (cloudStatus === "learning" || localStatus === "learning") {
                mergedLearned[id] = "learning";
              } else {
                mergedLearned[id] = "none";
              }
            });
            localStorage.setItem(k, JSON.stringify(mergedLearned));

          } else if (k === P + "bm_grammars") {
            // Gabungkan array bookmark grammar (tanpa duplikat)
            var mergedBm = combineArrays(localVal, cloudVal);
            localStorage.setItem(k, JSON.stringify(mergedBm));

          } else if (k === P + "bm_questions") {
            // Gabungkan array bookmark pertanyaan
            var mergedQ = localVal.slice();
            cloudVal.forEach(function (cq) {
              var cKey = cq.question || cq.q || cq.sentence;
              var exists = mergedQ.some(function (lq) {
                return (lq.question || lq.q || lq.sentence) === cKey;
              });
              if (!exists) mergedQ.push(cq);
            });
            localStorage.setItem(k, JSON.stringify(mergedQ));

          } else if (k === P + "history") {
            // Gabungkan riwayat belajar
            var mergedHist = localVal.slice();
            cloudVal.forEach(function (ch) {
              var exists = mergedHist.some(function (lh) {
                return lh.id === ch.id && lh.ts === ch.ts;
              });
              if (!exists) mergedHist.push(ch);
            });
            mergedHist.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
            if (mergedHist.length > 300) mergedHist = mergedHist.slice(0, 300);
            localStorage.setItem(k, JSON.stringify(mergedHist));

          } else if (k === P + "mistakes") {
            // Gabungkan riwayat kesalahan
            var mergedMist = localVal.slice();
            cloudVal.forEach(function (cm) {
              var exists = mergedMist.some(function (lm) {
                return lm.question === cm.question && lm.id === cm.id;
              });
              if (!exists) mergedMist.push(cm);
            });
            if (mergedMist.length > 500) mergedMist = mergedMist.slice(0, 500);
            localStorage.setItem(k, JSON.stringify(mergedMist));

          } else if (k === P + "stats") {
            // Gabungkan statistik
            var mergedStats = {
              total: (localVal.total || 0) + (cloudVal.total || 0),
              correct: (localVal.correct || 0) + (cloudVal.correct || 0),
              byLevel: {},
              byGrammar: {}
            };
            var localLvs = localVal.byLevel || {};
            var cloudLvs = cloudVal.byLevel || {};
            var levels = combineArrays(Object.keys(localLvs), Object.keys(cloudLvs));
            levels.forEach(function (lv) {
              var loc = localLvs[lv] || { total: 0, correct: 0 };
              var cld = cloudLvs[lv] || { total: 0, correct: 0 };
              mergedStats.byLevel[lv] = {
                total: loc.total + cld.total,
                correct: loc.correct + cld.correct
              };
            });
            var localGrs = localVal.byGrammar || {};
            var cloudGrs = cloudVal.byGrammar || {};
            var grammars = combineArrays(Object.keys(localGrs), Object.keys(cloudGrs));
            grammars.forEach(function (gId) {
              var loc = localGrs[gId] || { total: 0, correct: 0 };
              var cld = cloudGrs[gId] || { total: 0, correct: 0 };
              mergedStats.byGrammar[gId] = {
                total: loc.total + cld.total,
                correct: loc.correct + cld.correct
              };
            });
            localStorage.setItem(k, JSON.stringify(mergedStats));

          } else if (k === P + "srs") {
            // Gabungkan progres Leitner box flashcard (ambil tingkat box tertinggi)
            var mergedSRS = {};
            Object.keys(localVal).forEach(function (id) {
              mergedSRS[id] = localVal[id];
            });
            Object.keys(cloudVal).forEach(function (id) {
              var locCard = mergedSRS[id];
              var cldCard = cloudVal[id];
              if (!locCard) {
                mergedSRS[id] = cldCard;
              } else {
                if ((cldCard.box || 0) > (locCard.box || 0)) {
                  mergedSRS[id] = cldCard;
                }
              }
            });
            localStorage.setItem(k, JSON.stringify(mergedSRS));

          } else if (k.indexOf(P + "note_") === 0) {
            // Catatan pribadi: ambil yang terpanjang
            var localNote = typeof localVal === "string" ? localVal : JSON.stringify(localVal);
            var cloudNote = typeof cloudVal === "string" ? cloudVal : JSON.stringify(cloudVal);
            if (cloudNote.length > localNote.length) {
              localStorage.setItem(k, cloudNote);
            }
          } else {
            localStorage.setItem(k, typeof cloudVal === "string" ? cloudVal : JSON.stringify(cloudVal));
          }
        });

        function combineArrays(arr1, arr2) {
          var res = arr1.slice();
          arr2.forEach(function (x) {
            if (res.indexOf(x) === -1) res.push(x);
          });
          return res;
        }

        if (window.Nav && window.Nav.toast) {
          window.Nav.toast("Data progres berhasil digabungkan!");
        }

        setTimeout(function () {
          window.location.reload();
        }, 1000);

      } catch (err) {
        alert("Gagal mengimpor file: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  function renderUI() {
    var container = document.getElementById("backupSidebar");
    if (!container) return;

    container.innerHTML = 
      '<div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.45; margin-bottom: 8px;">' +
        'Cadangkan & pindahkan data progres belajarmu.' +
      '</div>' +
      '<div style="display: flex; flex-direction: column; gap: 6px;">' +
        '<button id="btnExportData" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; outline: none;">' +
          '<span>📥</span> Ekspor Progres' +
        '</button>' +
        '<button id="btnImportData" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; outline: none;">' +
          '<span>📤</span> Impor Progres' +
        '</button>' +
        '<input type="file" id="backupFileInput" accept=".json" style="display: none;">' +
      '</div>';

    var btnExport = document.getElementById("btnExportData");
    var btnImport = document.getElementById("btnImportData");
    var fileInput = document.getElementById("backupFileInput");

    if (btnExport) {
      btnExport.addEventListener("click", exportData);
      btnExport.addEventListener("mouseover", function () { btnExport.style.background = "var(--surface-2)"; });
      btnExport.addEventListener("mouseout", function () { btnExport.style.background = "var(--surface)"; });
    }

    if (btnImport) {
      btnImport.addEventListener("click", function () {
        if (confirm("Mengimpor data baru akan menggabungkan (merge) progres belajar di file cadangan dengan progres di perangkat ini. Apakah Anda yakin ingin melanjutkan?")) {
          fileInput.click();
        }
      });
      btnImport.addEventListener("mouseover", function () { btnImport.style.background = "var(--surface-2)"; });
      btnImport.addEventListener("mouseout", function () { btnImport.style.background = "var(--surface)"; });
    }

    if (fileInput) {
      fileInput.addEventListener("change", function (e) {
        var file = e.target.files[0];
        if (file) {
          importData(file);
        }
      });
    }
  }

  // Jalankan render setelah DOM siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderUI);
  } else {
    renderUI();
  }
})();
