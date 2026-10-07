"use strict";

(() => {
  const prompt = document.getElementById("claude-prompt");
  const button = document.getElementById("copy-prompt");
  const status = document.getElementById("copy-status");
  if (!prompt || !button || !status) return;

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "";
    try {
      await navigator.clipboard.writeText(prompt.value);
      status.textContent = "Prompt copied. Paste it into Claude.";
    } catch {
      prompt.focus();
      prompt.select();
      status.textContent = "Automatic copy is unavailable. The prompt is selected; press Ctrl+C or Command+C to copy it.";
    } finally {
      button.disabled = false;
    }
  });
})();
