import {extractHtml} from "./extract.js";
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message.target !== "parser") return;
  try { respond({ok:true, data:extractHtml(message.html, message.watch)}); }
  catch (error) { respond({ok:false, error:error.message}); }
});

