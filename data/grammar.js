/*
 * JLPT Bunpou Dataset (N4-N3) - file inisialisasi.
 * Tiap set grammar berada di file terpisah (grammar-n4.js, grammar-n3.js) dan
 * melakukan window.JLPT_DATA.push(...). Untuk menambah grammar baru, cukup
 * tambahkan object baru dengan struktur yang sama.
 *
 * Struktur entri:
 * {
 *   id, level, grammar, reading, romaji, meaning, difficulty(1-3),
 *   formula, explanation, nuance, whenUse, whenNotUse,
 *   comparisons:[{grammar,note}], mistakes:[...],
 *   examples:[{ jp, furigana, id, type:'simple'|'jlpt', tokens:[...], g:'bagian utk blank' }],
 *   quiz:[{ q, options:[], answer, grammar, explanation, why:[] }]  // MCQ seed; soal lain digenerate
 * }
 */
window.JLPT_DATA = window.JLPT_DATA || [];
