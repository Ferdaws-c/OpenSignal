import {classify, LABELS} from "./core.js";
import {extractHtml} from "./extract.js";
import {SCENARIOS, DEMO_NOW} from "./scenarios.js";
const select = document.getElementById("scenario");
for (const scenario of SCENARIOS) { const option = document.createElement("option"); option.value = scenario.id; option.textContent = scenario.title; select.append(option); }
function render() {
  const scenario = SCENARIOS.find(item => item.id === select.value);
  const extracted = extractHtml(scenario.html, scenario.watch);
  const result = classify(scenario.watch, extracted, DEMO_NOW);
  document.getElementById("resultStatus").textContent = LABELS[result.status];
  document.getElementById("resultStatus").className = "status " + result.status;
  document.getElementById("resultTitle").textContent = scenario.title;
  document.getElementById("resultReason").textContent = result.reason;
  document.getElementById("resultEvidence").textContent = extracted.text || extracted.error || "No readable text";
  document.getElementById("resultAlert").textContent = result.status === "open" ? "A real watch would send one desktop notification and show an open badge." : "No registration-open notification would be sent.";
}
select.onchange = render; render();

