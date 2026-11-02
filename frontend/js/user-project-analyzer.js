const form = document.querySelector("#analyzerForm");
const fileInput = document.querySelector("#projectFile");
const button = document.querySelector("#analyzeButton");
const status = document.querySelector("#status");
const report = document.querySelector("#report");

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function sessionToken() {
  return localStorage.getItem("hackathon_session_token") || localStorage.getItem("user_session_token");
}

function renderReport(data) {
  const cards = Object.entries(data.scores).map(([name, value]) => `<article class="metric"><span>${escapeHtml(name.replace("_", " "))}</span><b>${escapeHtml(value)}</b></article>`).join("");
  const findings = data.issues.length ? data.issues.map(issue => `<li class="${escapeHtml(issue.severity)}"><b>${escapeHtml(issue.severity.toUpperCase())}</b> — ${escapeHtml(issue.message)}${issue.path ? ` <small>(${escapeHtml(issue.path)})</small>` : ""}</li>`).join("") : "<li class=\"approved\">No static issues found.</li>";
  const summary = data.summary;
  report.innerHTML = `<article class="card summary"><div class="score">${escapeHtml(data.score)}<small>/100</small></div><div><p class="eyebrow">PROJECT READINESS</p><h2 class="verdict ${escapeHtml(data.verdict)}">${escapeHtml(data.verdict)}</h2><p>Fix critical findings before final project submission.</p></div></article><div class="grid">${cards}</div><article class="card"><h2>Findings (${data.issues.length})</h2><ul class="issues">${findings}</ul></article><article class="card meta"><h2>Evidence</h2><p>${summary.files_scanned} files scanned · ${summary.source_files} source files · ${summary.source_lines} lines</p><p>Languages: ${escapeHtml(Object.keys(summary.languages).join(", ") || "None detected")}</p><p>README: ${summary.readme ? "Yes" : "No"} · Tests: ${summary.tests ? "Yes" : "No"} · Manifest: ${escapeHtml(summary.manifest || "No")} · API signal: ${summary.api_signal ? "Yes" : "No"}</p></article>`;
  report.hidden = false;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const file = fileInput.files[0];
  const token = sessionToken();
  if (!token) {
    window.location.href = "/user/login";
    return;
  }
  if (!file || !file.name.toLowerCase().endsWith(".zip")) {
    status.textContent = "Choose a ZIP project file.";
    status.className = "status error";
    return;
  }
  button.disabled = true;
  status.className = "status";
  status.textContent = "Inspecting your project safely…";
  report.hidden = true;
  try {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`/api/user/project-analyzer/analyze?session_token=${encodeURIComponent(token)}`, {method: "POST", body});
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "Analysis failed.");
    renderReport(payload.report);
    status.textContent = "Analysis completed. Review the critical findings before submission.";
  } catch (error) {
    status.textContent = error.message || "Analysis failed.";
    status.className = "status error";
  } finally {
    button.disabled = false;
  }
});
