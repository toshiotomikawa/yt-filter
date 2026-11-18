"use strict";
const box = document.getElementById("words");
const status = document.getElementById("status");

browser.storage.sync.get({ words: YTF_DEFAULT_WORDS }).then(({ words }) => {
  box.value = words.join("\n");
});

let timer;
document.getElementById("save").addEventListener("click", async () => {
  const words = YTF.parseList(box.value);
  clearTimeout(timer);
  try {
    await browser.storage.sync.set({ words });
    box.value = words.join("\n");
    status.textContent = "Saved";
    timer = setTimeout(() => (status.textContent = ""), 2000);
  } catch {
    // Firefox Sync allows about 8 KB per setting.
    status.textContent = "The list is too long to save";
  }
});
