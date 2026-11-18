"use strict";
// Hides YouTube video cards whose titles match the saved words.
(function () {
  const CARD_LIST = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-playlist-video-renderer",
    "ytd-reel-item-renderer",
    "ytd-reel-video-renderer",
    "ytd-video-card-renderer",
    "ytd-structured-description-playlist-lockup-renderer",
    "yt-lockup-view-model",
    "ytm-shorts-lockup-view-model",
    "ytm-shorts-lockup-view-model-v2",
    "ytm-video-with-context-renderer",
    "ytm-compact-video-renderer",
    "ytm-media-item",
    "ytm-rich-item-renderer",
    "ytm-playlist-video-renderer",
    "ytd-playlist-panel-video-renderer",
    "ytm-playlist-panel-video-renderer",
    "ytd-playlist-renderer",
    "ytd-radio-renderer",
    ".ytp-videowall-still",
    ".ytp-modern-videowall-still",
    ".ytp-ce-video",
    ".ytp-ce-playlist",
  ];
  const CARDS = CARD_LIST.join(",");

  const TITLES = [
    "#video-title",
    "#video-title-link",
    ".yt-lockup-metadata-view-model__title",
    ".yt-lockup-metadata-view-model-wiz__title",
    ".shortsLockupViewModelHostMetadataTitle",
    ".ytShortsVideoTitleViewModelShortsVideoTitle",
    "yt-shorts-video-title-view-model h2",
    ".media-item-headline",
    ".ytp-videowall-still-info-title",
    ".ytp-modern-videowall-still-info-title",
    ".ytp-ce-video-title",
  ].join(",");

  // Rows and shelves that only frame cards; once every card in one is hidden, the frame goes too.
  const SHELVES = [
    "grid-shelf-view-model",
    "ytd-reel-shelf-renderer",
    "ytd-rich-shelf-renderer",
    "ytd-rich-section-renderer",
    "ytd-rich-grid-row",
    "ytd-shelf-renderer",
    "ytd-horizontal-card-list-renderer",
    "ytm-reel-shelf-renderer",
    "ytm-shelf-renderer",
    "ytm-rich-section-renderer",
  ].join(",");

  const MARK = "data-ytf-hidden";
  const VISIBLE_CARD = `:is(${CARDS}):not([${MARK}]):not([${MARK}] *)`;
  let regex = null;
  let queued = false;
  let full = true;
  const dirty = new Set();
  // Last title checked per card, so unchanged cards are skipped on each pass.
  let seen = new WeakMap();
  let loads = 0;

  // The first non-empty text wins. Headings are only a fallback: they wrap the real title element and would
  // otherwise win. Visible text comes before the title attribute, which YouTube can leave stale on recycled cards.
  function titleOf(card) {
    for (const el of [...card.querySelectorAll(TITLES), ...card.querySelectorAll("h3, h4")]) {
      const text = el.textContent?.trim() || el.getAttribute("title")?.trim() || el.getAttribute("aria-label")?.trim();
      if (text) return text;
    }
    return "";
  }

  function check(card) {
    const title = titleOf(card);
    if (seen.get(card) === title) return;
    seen.set(card, title);
    // A lockup nested inside a matched outer card is covered by the outer one.
    const hide = YTF.matches(regex, title);
    if (hide !== card.hasAttribute(MARK)) card.toggleAttribute(MARK, hide);
  }

  // Only the parts of the page that changed are checked, unless the words changed.
  function apply() {
    queued = false;
    if (full) {
      full = false;
      dirty.clear();
      for (const card of document.querySelectorAll(CARDS)) check(card);
      return;
    }
    const cards = new Set();
    for (const node of dirty) {
      const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!el?.isConnected) continue;
      for (let card = el.closest(CARDS); card; card = card.parentElement?.closest(CARDS)) cards.add(card);
      for (const card of el.querySelectorAll(CARDS)) cards.add(card);
    }
    dirty.clear();
    for (const card of cards) check(card);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  async function load() {
    const id = ++loads;
    const { words } = await browser.storage.sync.get({ words: YTF_DEFAULT_WORDS });
    // A newer load started while this one waited; its words win.
    if (id !== loads) return;
    regex = YTF.compile(Array.isArray(words) ? words : YTF_DEFAULT_WORDS);
    seen = new WeakMap();
    full = true;
    schedule();
  }

  const style = document.createElement("style");
  style.textContent = [
    `[${MARK}]{display:none!important}`,
    // Wrappers that hold nothing but hidden cards would otherwise leave blank gaps.
    `div:has(> [${MARK}]):not(:has(> :not([${MARK}]))){display:none!important}`,
    `:is(${SHELVES}):has([${MARK}]):not(:has(${VISIBLE_CARD})){display:none!important}`,
  ].join("\n");
  (document.head || document.documentElement).append(style);

  new MutationObserver((records) => {
    for (const r of records) {
      dirty.add(r.target);
      for (const n of r.addedNodes) dirty.add(n);
    }
    schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["title", "aria-label"],
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.words) load();
  });
  load();
})();
