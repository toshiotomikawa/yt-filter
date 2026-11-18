"use strict";
// Pure title matching, shared by the content script and the tests.
(function (root) {
  const pairs = (s) => new Map(s.match(/../gu).map((p) => [...p]));
  // Decorative small capitals people use to dodge filters.
  const SMALL = pairs("ᴀaʙbᴄcᴅdᴇeꜰfɢgʜhɪiᴊjᴋkʟlᴍmɴnᴏoᴘpǫqʀrꜱsᴛtᴜuᴠvᴡwʏyᴢz");
  // Cyrillic and Greek letters (lowercased) that pass for Latin; folded only inside words that also hold Latin letters or digits.
  const LOOK = pairs("аaвbеeкkмmнhоoрpсcтtуyхxіiјjѕsαaβbεeζzηhιiκkμmνvοoρpτtυyχx");
  const LOOK_RE = new RegExp(`[${[...LOOK.keys()].join("")}]`, "gu");
  const SMALL_RE = new RegExp(`[${[...SMALL.keys()].join("")}]`, "gu");

  // Marks are ignored on these scripts (accents, niqqud, harakat); the others need them to spell words.
  const LOOSE_MARKS = /([\p{sc=Latin}\p{sc=Common}\p{sc=Hebrew}\p{sc=Arabic}])\p{M}+/gu;
  // Scripts written without spaces: a word there can't need a boundary.
  const UNSPACED = /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Hangul}\p{sc=Thai}\p{sc=Lao}\p{sc=Khmer}\p{sc=Myanmar}]/u;
  // Characters that join a phrase's words: spaces and common title punctuation.
  const SEP = String.raw`[\s\-_:/–—.|•·~()\[\]]+`;
  const SPLIT = new RegExp(String.raw`(?<=[\p{L}\p{N}])${SEP}(?=[\p{L}\p{N}])`, "u");
  // A zero-width joiner only matters between emoji (it builds 🏳\uFE0F\u200D🌈); elsewhere it is filler.
  const ZW = /[\u200B\u200C\u00AD\u034F\u2060\uFEFF]|(?<![\p{Extended_Pictographic}\uFE0F])\u200D|\u200D(?!\p{Extended_Pictographic})/gu;
  // Raised and circled digits: a number after a letter or digit ("6²", "VI①") is a footnote, otherwise the digit itself.
  const DIGITS = /[²³¹⁰⁴-⁹①-⑳]/g;
  const SPACES = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069\u115F\u1160\u2800\u3164\uFFA0]/g;
  const COMPAT = /[ﬀ-ﬆ！-～₀-ₜⅠ-ⅿⒶ-ⓩ\u{1D400}-\u{1D7FF}]/gu;
  const ENCLOSED = /[\u{1F130}-\u{1F149}\u{1F150}-\u{1F169}\u{1F170}-\u{1F189}]/gu;

  // zw: what zero-width characters become ("" joins, " " splits). Titles are tried both ways.
  function normalize(text, zw = "") {
    if (typeof text !== "string") {
      if (typeof text !== "number") return "";
      text = String(text);
    }
    return text
      .replace(ZW, zw)
      .replace(SPACES, " ")
      .replace(COMPAT, (c) => c.normalize("NFKC"))
      .replace(ENCLOSED, (c) => String.fromCharCode(97 + ((c.codePointAt(0) - 0x1f130) % 0x20)))
      .replace(DIGITS, (c, i, s) => (/[\p{L}\p{N}]/u.test(s[i - 1] ?? "") ? " " : c.normalize("NFKC")))
      .replace(/[\p{Cf}--[\u200D]]/gv, "")
      .toLowerCase()
      .replace(SMALL_RE, (c) => SMALL.get(c))
      .replace(/ß/g, "ss")
      .replace(/ı/g, "i")
      .replace(/[\p{L}\p{Nd}]+/gu, (w) => (/[a-z0-9]/.test(w) ? w.replace(LOOK_RE, (c) => LOOK.get(c)) : w))
      .normalize("NFD")
      .replace(LOOSE_MARKS, "$1")
      .normalize("NFC")
      .replace(/[‘’ʼ]/g, "'")
      .replace(/[‐-‒−]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escape(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // What may not touch a term's edge, so a term only matches whole ("gta" skips "gtav").
  // A number also ends at a decimal point or clock colon: "6" skips "6.5" and "10" skips "10:00".
  function guard(ch, side) {
    if (!ch || !/[\p{L}\p{N}]/u.test(ch) || UNSPACED.test(ch)) return "";
    const near = /[\p{sc=Latin}\p{N}]/u.test(ch)
      ? String.raw`[\p{sc=Latin}\p{sc=Greek}\p{sc=Cyrillic}\p{Nd}\p{M}]`
      : String.raw`[\p{L}\p{Nd}\p{M}]`;
    const digit = /\d/.test(ch);
    return side === "before"
      ? `(?<!${near})${digit ? String.raw`(?<!\d[.,:])` : ""}`
      : `(?!${near})${digit ? String.raw`(?![.,:]\d)` : ""}`;
  }

  // One regex for all words. Terms with the same edge rules share one pair of guards, which keeps long lists fast.
  function compile(words) {
    if (!Array.isArray(words)) return null;
    const terms = new Set(words.map((w) => (typeof w === "string" ? normalize(w) : "")).filter(Boolean));
    if (!terms.size) return null;
    const groups = new Map();
    for (const term of terms) {
      const chars = [...term];
      const key = guard(chars[0], "before") + "\0" + guard(chars.at(-1), "after");
      // Punctuation between a phrase's words matches any joining punctuation, so "gta 6" catches "GTA-6" and "GTA: 6".
      const body = term.split(SPLIT).map(escape).join(SEP);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(body);
    }
    const alts = [...groups].map(([key, bodies]) => {
      const [before, after] = key.split("\0");
      return `${before}(?:${bodies.join("|")})${after}`;
    });
    return new RegExp(alts.join("|"), "u");
  }

  function matches(regex, title) {
    if (!regex || (typeof title !== "string" && typeof title !== "number") || title === "") return false;
    const plain = normalize(title);
    if (regex.test(plain)) return true;
    // Zero-width characters may stand for a space ("GTA\u200BVI") or hide inside a word ("GT\u200BA").
    const spaced = normalize(title, " ");
    return spaced !== plain && regex.test(spaced);
  }

  // Settings text: one word or phrase per line.
  function parseList(text) {
    if (text == null) return [];
    const lines = String(text)
      .split(/\r?\n/)
      .map((l) => l.replace(/\p{Cf}/gu, "").trim());
    return [...new Set(lines.filter(Boolean))];
  }

  const api = { normalize, compile, matches, parseList };
  root.YTF = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
