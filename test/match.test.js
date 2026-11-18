"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { compile, matches, parseList, normalize } = require("../src/match.js");

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

test("normalize folds full-width characters", () => {
  assert.equal(normalize("ＧＴＡ６"), "gta6");
});
