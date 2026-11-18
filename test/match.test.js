"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { compile, matches, parseList, normalize } = require("../src/match.js");
const { performance } = require("node:perf_hooks");

const words = ["GTA VI", "GTA 6", "GTA6", "Grand Theft Auto VI"];
const re = compile(words);

test("hides titles with any word, ignoring case", () => {
  assert.ok(matches(re, "GTA VI trailer 3 breakdown"));
  assert.ok(matches(re, "Everything we know about gta 6"));
  assert.ok(matches(re, "GTA6 leaks!!"));
  assert.ok(matches(re, "GRAND THEFT AUTO VI: release date"));
});

test("matches whole words only", () => {
  assert.ok(!matches(re, "GTA VII fan concept"));
  assert.ok(!matches(re, "GTA 60fps mod"));
  assert.ok(!matches(re, "Playing GTA V online"));
  assert.ok(!matches(re, "Cooking pasta"));
});

test("tolerates extra spaces and line breaks inside a phrase", () => {
  assert.ok(matches(re, "GTA   VI\nmap size"));
});

test("ignores accents", () => {
  assert.ok(matches(compile(["pokemon"]), "Novo Pokémon anunciado"));
  assert.ok(matches(compile(["Pokémon"]), "pokemon news"));
});

test("treats regex characters in words literally", () => {
  const r = compile(["c++", "a.b"]);
  assert.ok(matches(r, "Learn C++ fast"));
  assert.ok(!matches(r, "aXb"));
});

test("empty list hides nothing", () => {
  assert.equal(compile([]), null);
  assert.equal(compile(["", "  "]), null);
  assert.ok(!matches(null, "GTA VI"));
});

test("empty title is never hidden", () => {
  assert.ok(!matches(re, ""));
});

test("parseList trims, drops blanks and duplicates", () => {
  assert.deepEqual(parseList(" GTA VI \r\n\n GTA VI\nfoo "), ["GTA VI", "foo"]);
});

test("phrases match across joining punctuation", () => {
  const re = compile(["GTA 6", "Grand Theft Auto VI"]);
  for (const title of ["GTA-6 trailer", "GTA: 6", "GTA:6", "GTA - 6", "GTA_6", "GTA/6", "GTA–6", "Grand Theft Auto: VI"]) {
    assert.ok(matches(re, title), title);
  }
  assert.ok(!matches(re, "GTA-60fps"));
});

test("invisible format characters do not hide a match", () => {
  const re = compile(["GTA VI"]);
  assert.ok(matches(re, "GT\u200BA VI"));
  assert.ok(matches(re, "GTA\u00AD VI"));
});

test("normalize folds full-width characters", () => {
  assert.equal(normalize("ＧＴＡ６"), "gta6");
});

test("other scripts keep their marks, so different words stay different", () => {
  assert.ok(!matches(compile(["バス"]), "【パス】無料配布"));
  assert.ok(!matches(compile(["काम"]), "कम समय में सीखें"));
  assert.ok(!matches(compile(["мой"]), "мои лучшие моменты"));
  assert.ok(matches(compile(["שלום"]), "שָׁלוֹם לְכֻלָּם"));
});

test("words match next to scripts written without spaces", () => {
  const re = compile(["GTA 6", "ネタバレ"]);
  assert.ok(matches(re, "新作GTA6がヤバすぎる".replace("GTA6", "GTA 6")));
  assert.ok(matches(compile(["GTA6"]), "GTA6の最新情報まとめ"));
  assert.ok(matches(re, "【ネタバレ注意】エンディング"));
});

test("long phrases of punctuation compile without slow backtracking", () => {
  const word = "a" + " -".repeat(30) + " b";
  const start = performance.now();
  assert.ok(!matches(compile([word]), "a" + " -".repeat(36) + " c"));
  assert.ok(performance.now() - start < 100);
});

test("symbols, footnotes and decorative letters", () => {
  const re = compile(["GTA 6", "GTA VI"]);
  for (const title of ["GTA 6™ Trailer", "GTA 6² Remastered", "GTA VI①", "GТА 6", "ɢᴛᴀ 6", "🅶🆃🅰 6", "GTA ₆", "GTA.6.Official", "GTA (6) Trailer", "GTA\u200BVI", "GTA\u28006"]) {
    assert.ok(matches(re, title), title);
  }
  assert.ok(!matches(compile(["c"]), "100℃ Boiling Water"));
  assert.ok(!matches(compile(["6"]), "Patch 6.5 Notes"));
  assert.ok(!matches(compile(["10"]), "10:00 Speedrun"));
});

test("words with punctuation at the edge", () => {
  assert.ok(matches(compile([".NET"]), "ASP.NET Core Tutorial"));
  assert.ok(matches(compile(["C++"]), "Modern C++20 Features"));
  assert.ok(matches(compile(["don't"]), "Don’t Click This"));
  assert.ok(matches(compile(["große"]), "GROSSE NEWS"));
});

test("bad input never throws", () => {
  assert.equal(compile(null), null);
  assert.equal(compile([null, 3]), null);
  assert.ok(!matches(compile(["null"]), null));
  assert.deepEqual(parseList(null), []);
  assert.deepEqual(parseList("\u200B\nGTA 6"), ["GTA 6"]);
  assert.equal(normalize(Object.create(null)), "");
});
