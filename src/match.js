"use strict";
// Pure title matching, shared by the content script and the tests.
(function (root) {
  function normalize(text) {
    return String(text)
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function escape(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // One regex for all words; a word only matches whole, so "gta" skips "gtav".
  function compile(words) {
    const terms = [...new Set(words.map(normalize).filter(Boolean))];
    if (!terms.length) return null;
    const body = terms.map((t) => escape(t).replace(/ /g, "\\s+")).join("|");
    return new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, "u");
  }

  function matches(regex, title) {
    return Boolean(regex && title && regex.test(normalize(title)));
  }

  // Settings text: one word or phrase per line.
  function parseList(text) {
    return [...new Set(String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
  }

  const api = { normalize, compile, matches, parseList };
  root.YTF = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
