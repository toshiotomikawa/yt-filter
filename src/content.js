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
    "ytm-playlist-video-renderer",
    "ytd-playlist-panel-video-renderer",
    "ytm-playlist-panel-video-renderer",
    "ytd-playlist-renderer",
    "ytd-radio-renderer",
    ".ytp-videowall-still",
    ".ytp-modern-videowall-still",
    ".ytp-ce-video",
    ".ytp-ce-playlist",
  ].join(",");

  const TITLES = [
    "#video-title",
    "#video-title-link",
    ".yt-lockup-metadata-view-model__title",
    ".yt-lockup-metadata-view-model-wiz__title",
    ".shortsLockupViewModelHostMetadataTitle",
    ".media-item-headline",
    ".ytp-videowall-still-info-title",
    ".ytp-modern-videowall-still-info-title",
    ".ytp-ce-video-title",
  ].join(",");

  const MARK = "data-ytf-hidden";
  let regex = null;
  let queued = false;
  // Last title checked per card, so unchanged cards are skipped on each pass.
  let seen = new WeakMap();

  // querySelector returns the first match in page order, so headings are only a fallback:
  // they wrap the real title element and would otherwise win.
  function titleOf(card) {
    const el = card.querySelector(TITLES) || card.querySelector("h3, h4");
    return (el?.getAttribute("title") || el?.textContent || el?.getAttribute("aria-label") || "").trim();
  }

  function apply() {
    queued = false;
    // Cards are recycled when YouTube swaps content, so a card is rechecked whenever its title changes.
    for (const card of document.querySelectorAll(CARDS)) {
      const title = titleOf(card);
      if (seen.get(card) === title) continue;
      seen.set(card, title);
      // A lockup nested inside a matched outer card is covered by the outer one.
      const hide = YTF.matches(regex, title);
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
    seen = new WeakMap();
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
