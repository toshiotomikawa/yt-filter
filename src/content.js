"use strict";
// Hides YouTube video cards whose titles match the saved words.
(function () {
  const CARDS = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-playlist-video-renderer",
    "ytd-reel-item-renderer",
    "yt-lockup-view-model",
    "ytm-shorts-lockup-view-model",
    "ytm-shorts-lockup-view-model-v2",
    "ytm-video-with-context-renderer",
    "ytm-compact-video-renderer",
    "ytm-media-item",
    "ytm-rich-item-renderer",
  ].join(",");

  const TITLES = [
    "#video-title",
    "#video-title-link",
    ".yt-lockup-metadata-view-model__title",
    ".yt-lockup-metadata-view-model-wiz__title",
    ".shortsLockupViewModelHostMetadataTitle",
    ".media-item-headline",
    "h3",
    "h4",
  ].join(",");

  const MARK = "data-ytf-hidden";
  let regex = null;
  let queued = false;

  function titleOf(card) {
    const el = card.querySelector(TITLES);
    const text = el && (el.getAttribute("title") || el.textContent);
    return (text || card.querySelector("[aria-label]")?.getAttribute("aria-label") || "").trim();
  }

  function apply() {
    queued = false;
    // Cards are recycled when YouTube swaps content, so every pass rechecks all of them.
    for (const card of document.querySelectorAll(CARDS)) {
      // A lockup nested inside a matched outer card is covered by the outer one.
      const hide = YTF.matches(regex, titleOf(card));
      if (hide !== card.hasAttribute(MARK)) card.toggleAttribute(MARK, hide);
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  async function load() {
    const { words } = await browser.storage.sync.get({ words: YTF_DEFAULT_WORDS });
    regex = YTF.compile(words);
    schedule();
  }

  const style = document.createElement("style");
  style.textContent = `[${MARK}]{display:none!important}`;
  (document.head || document.documentElement).append(style);

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.words) load();
  });
  load();
})();
