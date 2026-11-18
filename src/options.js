"use strict";
const box = document.getElementById("words");
const status = document.getElementById("status");

browser.storage.sync.get({ words: YTF_DEFAULT_WORDS }).then(({ words }) => {
  box.value = words.join("\n");
});

document.getElementById("save").addEventListener("click", async () => {
  const words = YTF.parseList(box.value);
  await browser.storage.sync.set({ words });
  box.value = words.join("\n");
  status.textContent = "Saved";
  setTimeout(() => (status.textContent = ""), 2000);
});
