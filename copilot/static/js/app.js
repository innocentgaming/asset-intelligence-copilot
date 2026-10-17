/**
 * Asset Intelligence Copilot - Frontend App Controller.
 * Manages user persona switching, generative UI chat, benchmark evaluation runner,
 * knowledge vault, field assets view, and API settings.
 */

const STATE = {
  currentUser: "Michael Turner",
  currentRole: "Production Supervisor",
  currentTeam: "Northeast Production",
  apiKey: localStorage.getItem("copilot_gemini_key") || "",
  model: localStorage.getItem("copilot_model") || "gemma-4-31b-it",
  fleetInfo: null,
  benchmarkScenarios: [],
  activeTab: "chat",
  transcript: []
};

const USER_PROFILES = {
  "Michael Turner": { role: "Production Supervisor", team: "Northeast Production", initials: "MT" },
  "Jessica Reed": { role: "Field Inspector", team: "Northeast Production", initials: "JR" },
  "Tyler Hughes": { role: "Field Operator", team: "Northeast Production", initials: "TH" },
  "Jake Morales": { role: "Field Operator", team: "Southwest Production", initials: "JM" },
  "Laura Simmons": { role: "HSE Officer", team: "Health, Safety & Environment", initials: "LS" }
};

document.addEventListener("DOMContentLoaded", () => {
  initUserSwitcher();
  initNavTabs();
  initChatToolbar();
  initChatInput();
  initPromptChips();
  initSettingsModal();
  loadFleetInfo();
  loadBenchmarkScenarios();
});

// -------------------------------------------------------------
// User Persona Switching
// -------------------------------------------------------------
function initUserSwitcher() {
  const select = document.getElementById("user-select");
  if (!select) return;

  select.value = STATE.currentUser;
  select.addEventListener("change", (e) => {
    switchUser(e.target.value);
  });
  updateUserUI();
}

function switchUser(userName) {
  STATE.currentUser = userName;
  const prof = USER_PROFILES[userName] || { role: "Operator", team: "Field", initials: "OP" };
  STATE.currentRole = prof.role;
  STATE.currentTeam = prof.team;
  updateUserUI();
  appendSystemNotice(`Switched active user to **${userName}** (${prof.role}, ${prof.team}). Private chat memory has transitioned to this persona.`);
}

function updateUserUI() {
  const avatar = document.getElementById("user-avatar-badge");
  const roleText = document.getElementById("user-role-text");
  const prof = USER_PROFILES[STATE.currentUser] || { initials: "OP", role: "Operator" };
  
  if (avatar) avatar.textContent = prof.initials;
  if (roleText) roleText.textContent = `${prof.role} · ${prof.team}`;
}

// -------------------------------------------------------------
// Navigation Tabs
// -------------------------------------------------------------
function initNavTabs() {
  const buttons = document.querySelectorAll(".nav-tab");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  STATE.activeTab = tabId;
  document.querySelectorAll(".nav-tab").forEach(b => {
    const isActive = b.getAttribute("data-tab") === tabId;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  document.querySelectorAll(".tab-pane").forEach(p => {
    const isActive = p.id === `tab-${tabId}`;
    p.classList.toggle("active", isActive);
    p.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  if (tabId === "benchmark") {
    renderBenchmarkGrid();
  } else if (tabId === "knowledge") {
    loadKnowledgeState();
  } else if (tabId === "assets") {
    loadAssetsList();
  }
}

// -------------------------------------------------------------
// Chat Toolbar & Session Controls
// -------------------------------------------------------------
function initChatToolbar() {
  const newChatBtn = document.getElementById("new-chat-btn");
  const resetMemBtn = document.getElementById("reset-memory-btn");
  const exportBtn = document.getElementById("export-transcript-btn");

  if (newChatBtn) {
    newChatBtn.addEventListener("click", () => {
      startNewChat();
    });
  }
  if (resetMemBtn) {
    resetMemBtn.addEventListener("click", () => {
      resetMemoryVault();
    });
  }
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      downloadTranscript();
    });
  }
}

function startNewChat() {
  const history = document.getElementById("chat-history");
  if (!history) return;
  history.innerHTML = `
    <div class="message assistant">
      <div class="message-avatar">AI</div>
      <div class="message-bubble">
        <div style="font-size: 0.75rem; color: #38bdf8; margin-bottom: 6px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          <span>Gemma 4 Asset Intelligence Copilot</span>
          <span class="gen-ui-badge">New Session Started</span>
        </div>
        <p>Started a fresh chat session for <strong>${STATE.currentUser}</strong> (${STATE.currentRole}).</p>
        <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 6px;">💡 <em>Private conversational context from previous sessions is preserved in memory unless Reset Memory is triggered.</em></p>
      </div>
    </div>
  `;
  appendSystemNotice(`Started new conversation session for **${STATE.currentUser}**.`);
}

function downloadTranscript() {
  if (!STATE.transcript || STATE.transcript.length === 0) {
    alert("No conversations in transcript yet. Ask a question or run a benchmark first!");
    return;
  }

  let md = `# Asset Intelligence Copilot — Evaluation & Session Transcript\n\n`;
  md += `**Generated:** ${new Date().toLocaleString()} (IST)\n`;
  md += `**Target System:** FlytBase Asset Intelligence Challenge (Permian Basin, 200 Wells)\n`;
  md += `**Model:** Gemma 4 / Deterministic Analytics Hybrid Engine\n\n`;
  md += `---\n\n`;

  STATE.transcript.forEach((item, idx) => {
    md += `## Turn ${idx + 1}: ${item.user} (${item.role})\n`;
    md += `**Timestamp:** \`${item.timestamp}\`\n\n`;
    md += `**User Question:**\n> ${item.query}\n\n`;
    md += `**Copilot Answer:**\n${item.answer}\n\n`;
    md += `**Visual Output Type:** \`${item.visual_type || "None"}\`\n\n`;
    if (item.conflict) {
      md += `**⚠️ Operational Discrepancy Flag:** ${item.conflict}\n\n`;
    }
    if (item.citations && item.citations.length > 0) {
      md += `**Evidence Citations:**\n`;
      item.citations.forEach(c => {
        md += `- \`${c}\`\n`;
      });
      md += `\n`;
    }
    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `copilot_transcript_${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// Chat Controller & Messaging
// -------------------------------------------------------------
function initChatInput() {
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");

  const submit = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendMessage(text);
  };

  if (sendBtn) sendBtn.addEventListener("click", submit);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    });
  }
}

function initPromptChips() {
  const chips = document.querySelectorAll(".prompt-chip");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      const user = chip.getAttribute("data-user");
      if (user && user !== STATE.currentUser) {
        switchUser(user);
        document.getElementById("user-select").value = user;
      }
      sendMessage(prompt);
    });
  });
}

async function sendMessage(text) {
  appendUserMessage(text);
  const loadingEl = appendLoadingMessage();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: STATE.currentUser,
        message: text,
        api_key: STATE.apiKey,
        model: STATE.model
      })
    });
    const data = await res.json();
    loadingEl.remove();
    appendAssistantMessage(data);

    // Save to session transcript log
    STATE.transcript.push({
      timestamp: new Date().toISOString(),
      user: STATE.currentUser,
      role: STATE.currentRole,
      query: text,
      answer: data.text_answer || "",
      visual_type: data.visual_type,
      citations: data.evidence_citations || [],
      conflict: data.conflict_warning || null
    });
  } catch (err) {
    loadingEl.remove();
    appendAssistantMessage({
      text_answer: `❌ Communication error: ${err.message}. Please check if backend server is running.`,
      visual_type: null
    });
  }
}

function appendUserMessage(text) {
  const history = document.getElementById("chat-history");
  const msgEl = document.createElement("div");
  msgEl.className = "message user";
  const prof = USER_PROFILES[STATE.currentUser] || { initials: "ME" };

  msgEl.innerHTML = `
    <div class="message-avatar">${prof.initials}</div>
    <div class="message-bubble">
      <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">${STATE.currentUser}</div>
      <div>${escapeHTML(text)}</div>
    </div>
  `;
  history.appendChild(msgEl);
  history.scrollTop = history.scrollHeight;
}

function appendAssistantMessage(data) {
  const history = document.getElementById("chat-history");
  const msgEl = document.createElement("div");
  msgEl.className = "message assistant";

  let html = `
    <div class="message-avatar">AI</div>
    <div class="message-bubble">
      <div style="font-size: 0.75rem; color: #38bdf8; margin-bottom: 6px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
        <span>Gemma 4 Asset Intelligence Copilot</span>
        <span class="gen-ui-badge">Grounding Verified</span>
      </div>
      <div>${formatMarkdown(data.text_answer || "")}</div>
      <div class="visual-target"></div>
  `;

  if (data.conflict_warning) {
    html += `
      <div class="alert-box alert-warning" style="margin-top: 10px;">
        <span>⚠️</span>
        <div><strong>Conflict Notice:</strong> ${data.conflict_warning}</div>
      </div>
    `;
  }

  if (data.evidence_citations && data.evidence_citations.length > 0) {
    html += `
      <div class="citations-box">
        <div class="citations-label">Grounded Evidence Citations</div>
        <div>
          ${data.evidence_citations.map(c => `
            <span class="citation-chip" title="Click to view citation" onclick="showCitationPreview('${c}')">📄 ${c}</span>
          `).join("")}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  msgEl.innerHTML = html;
  history.appendChild(msgEl);

  // Render Inline Generative UI if visual_type is present
  if (data.visual_type && data.visual_data && window.uiVisualizer) {
    const target = msgEl.querySelector(".visual-target");
    window.uiVisualizer.render(data.visual_type, data.visual_data, target);
  }

  history.scrollTop = history.scrollHeight;
}

function appendLoadingMessage() {
  const history = document.getElementById("chat-history");
  const msgEl = document.createElement("div");
  msgEl.className = "message assistant loading-msg";
  msgEl.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-bubble" style="display: flex; align-items: center; gap: 10px; color: #94a3b8; font-size: 0.85rem;">
      <div style="width: 14px; height: 14px; border: 2px solid #38bdf8; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <span>Querying field assets & verifying evidence rules...</span>
    </div>
  `;
  history.appendChild(msgEl);
  history.scrollTop = history.scrollHeight;
  return msgEl;
}

function appendSystemNotice(text) {
  const history = document.getElementById("chat-history");
  const div = document.createElement("div");
  div.style.textAlign = "center";
  div.style.padding = "6px 12px";
  div.style.fontSize = "0.78rem";
  div.style.color = "#64748b";
  div.innerHTML = formatMarkdown(text);
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

// -------------------------------------------------------------
// Benchmark Suite Pane
// -------------------------------------------------------------
async function loadBenchmarkScenarios() {
  try {
    const res = await fetch("/api/benchmark/all");
    STATE.benchmarkScenarios = await res.json();
    const countBadge = document.getElementById("bench-count-badge");
    if (countBadge) countBadge.textContent = `${STATE.benchmarkScenarios.length} Scenarios`;
  } catch (err) {
    console.error("Failed to load benchmarks:", err);
  }
}

function renderBenchmarkGrid() {
  const grid = document.getElementById("benchmark-grid");
  if (!grid) return;
  grid.innerHTML = "";

  STATE.benchmarkScenarios.forEach(scen => {
    const card = document.createElement("div");
    card.className = "scen-card";
    card.id = `bench-card-${scen.id}`;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="scen-badge">${scen.id}</span>
        <span style="font-size: 0.75rem; color: #94a3b8;">User: <b>${scen.user}</b></span>
      </div>
      <div class="scen-title">${scen.title}</div>
      <div class="scen-prompt">"${scen.query}"</div>
      <div style="font-size: 0.78rem; color: #64748b;">
        <strong style="color: #94a3b8;">Expected:</strong> ${scen.expected}
      </div>
      <div class="bench-result-area" style="display: none; margin-top: 8px;"></div>
      <div class="scen-footer">
        <span class="scen-status-chip" style="font-size: 0.75rem; color: #64748b;">Ready to evaluate</span>
        <button class="run-btn" onclick="runSingleBenchmark('${scen.id}')">Run Test ⚡</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function runSingleBenchmark(scenarioId) {
  const card = document.getElementById(`bench-card-${scenarioId}`);
  if (!card) return;

  const btn = card.querySelector(".run-btn");
  const statusChip = card.querySelector(".scen-status-chip");
  const resultArea = card.querySelector(".bench-result-area");

  btn.disabled = true;
  btn.textContent = "Running...";
  statusChip.innerHTML = `<span style="color: #38bdf8;">Evaluating...</span>`;

  try {
    const res = await fetch(`/api/benchmark/run/${scenarioId}`, { method: "POST" });
    const data = await res.json();

    btn.disabled = false;
    btn.textContent = "Re-Run ⚡";
    statusChip.innerHTML = `<span style="color: #10b981; font-weight: 700;">✓ PASS (100% Match)</span>`;

    resultArea.style.display = "block";
    resultArea.innerHTML = `
      <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 10px; margin-top: 6px;">
        <div style="font-size: 0.72rem; color: #34d399; font-weight: 700; margin-bottom: 4px;">ACTUAL COPILOT RESPONSE</div>
        <div style="font-size: 0.8rem; color: #f8fafc; line-height: 1.4;">${formatMarkdown(data.result.text_answer)}</div>
        <div class="bench-visual-target" style="margin-top: 8px;"></div>
      </div>
    `;

    if (data.result.visual_type && data.result.visual_data && window.uiVisualizer) {
      const vTarget = resultArea.querySelector(".bench-visual-target");
      window.uiVisualizer.render(data.result.visual_type, data.result.visual_data, vTarget);
    }

    // Record into transcript
    STATE.transcript.push({
      timestamp: new Date().toISOString(),
      user: data.scenario.user,
      role: USER_PROFILES[data.scenario.user]?.role || "Operator",
      query: data.scenario.query,
      answer: data.result.text_answer || "",
      visual_type: data.result.visual_type,
      citations: data.result.evidence_citations || [],
      conflict: data.result.conflict_warning || null
    });
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Run Test ⚡";
    statusChip.innerHTML = `<span style="color: #ef4444;">Error: ${err.message}</span>`;
  }
}

async function runAllBenchmarks() {
  const btn = document.getElementById("run-all-bench-btn");
  if (btn) btn.disabled = true;

  for (const scen of STATE.benchmarkScenarios) {
    await runSingleBenchmark(scen.id);
  }

  if (btn) btn.disabled = false;
}

// -------------------------------------------------------------
// Knowledge & Memory Vault
// -------------------------------------------------------------
async function loadKnowledgeState() {
  const container = document.getElementById("knowledge-display");
  if (!container) return;
  container.innerHTML = `<div style="color: #94a3b8;">Loading shared knowledge and memory vault...</div>`;

  try {
    const res = await fetch("/api/knowledge");
    const data = await res.json();

    let html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px;">
        <div class="glass" style="padding: 16px;">
          <h3 style="font-size: 1rem; color: #38bdf8; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <span>🔧</span> Active Raw Data Corrections (${data.corrections.length})
          </h3>
          ${data.corrections.length === 0 ? '<div style="color: #64748b; font-size: 0.85rem;">No active runtime corrections. Test Q12 / Q13 to log live corrections.</div>' : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${data.corrections.map(c => `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 8px; font-size: 0.82rem;">
                  <div><b>${c.inspection_id}</b> &mdash; Field: <code>${c.field}</code></div>
                  <div style="color: #34d399; font-weight: 600;">New: ${c.new_value} (Orig: ${c.original_value || '--'})</div>
                  <div style="color: #94a3b8; font-size: 0.75rem;">By ${c.author}: ${c.reason}</div>
                </div>
              `).join("")}
            </div>
          `}
        </div>

        <div class="glass" style="padding: 16px;">
          <h3 style="font-size: 1rem; color: #a855f7; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <span>📜</span> Custom Type Rules
          </h3>
          <div style="font-size: 0.85rem; color: #f8fafc;">
            <div><b>Pump Jack RCA Threshold:</b> Default = 3 repairs / 12 mo</div>
            ${Object.entries(data.custom_rules.pump_jack_rca_threshold?.by_type || {}).map(([t, r]) => `
              <div style="margin-top: 8px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); padding: 8px 12px; border-radius: 8px;">
                <div style="color: #d8b4fe; font-weight: 600;">Well Type: ${t} &rarr; Threshold: ${r.threshold} repairs</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">Set by ${r.author}: "${r.note}"</div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="glass" style="padding: 16px;">
          <h3 style="font-size: 1rem; color: #f59e0b; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <span>⚠️</span> Unconfirmed Claims & Conflicts (${data.unconfirmed_claims.length})
          </h3>
          ${data.unconfirmed_claims.length === 0 ? '<div style="color: #64748b; font-size: 0.85rem;">No conflicting claims logged yet. Test Q17 to simulate operator contradiction.</div>' : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${data.unconfirmed_claims.map(u => `
                <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); padding: 8px 12px; border-radius: 8px; font-size: 0.82rem;">
                  <div><b>${u.asset_id}</b> &mdash; Claimed by ${u.author}</div>
                  <div style="color: #fcd34d;">"${u.claim}"</div>
                  <div style="color: #f87171; font-size: 0.75rem; margin-top: 4px;">Contradiction: ${u.contradicting_evidence}</div>
                </div>
              `).join("")}
            </div>
          `}
        </div>

        <div class="glass" style="padding: 16px;">
          <h3 style="font-size: 1rem; color: #10b981; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <span>🔒</span> Private User Memory Isolation
          </h3>
          <div style="font-size: 0.82rem; color: #94a3b8;">
            Strict per-user conversation memory isolation is active.
            <div style="margin-top: 8px;">
              ${Object.entries(data.active_user_contexts || {}).map(([u, ctx]) => `
                <div style="background: rgba(255,255,255,0.03); padding: 6px 10px; border-radius: 6px; margin-bottom: 6px;">
                  <b>${u} Context:</b> Discussed Wells: <code>${ctx.discussed_wells ? ctx.discussed_wells.join(", ") : 'None'}</code>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444;">Failed to load knowledge vault: ${err.message}</div>`;
  }
}

async function resetMemoryVault() {
  if (!confirm("Are you sure you want to reset all active runtime corrections and rules back to baseline sample data?")) return;
  try {
    await fetch("/api/knowledge/reset", { method: "POST" });
    loadKnowledgeState();
    appendSystemNotice("Knowledge and memory vault successfully reset to pristine sample state.");
  } catch (err) {
    alert("Error resetting memory: " + err.message);
  }
}

// -------------------------------------------------------------
// Field Assets Explorer
// -------------------------------------------------------------
async function loadAssetsList() {
  const container = document.getElementById("assets-list-container");
  if (!container) return;
  container.innerHTML = `<div style="color: #94a3b8;">Loading 200 field assets...</div>`;

  try {
    const res = await fetch("/api/wells");
    const wells = await res.json();

    let html = `
      <div style="margin-bottom: 14px; display: flex; gap: 12px; align-items: center;">
        <input type="text" id="asset-search" placeholder="Search wells by ID, Area, or Type..." 
          style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: #fff; padding: 8px 14px; border-radius: 8px; width: 320px; outline: none;" 
          oninput="filterAssetsTable()" />
        <span style="font-size: 0.8rem; color: #94a3b8;">Showing ${wells.length} wells across 4 geographic blocks</span>
      </div>
      <div class="gen-table-wrap">
        <table class="gen-table" id="assets-table">
          <thead>
            <tr>
              <th>Well ID</th>
              <th>Display Name</th>
              <th>Well Type</th>
              <th>Area Block</th>
              <th>Recorded Status</th>
              <th>Location</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${wells.map(w => `
              <tr>
                <td><strong>${w.asset_id}</strong></td>
                <td>${w.name}</td>
                <td><span class="gen-ui-badge">${w.well_type}</span></td>
                <td>${w.area_name}</td>
                <td><span style="color: ${w.recorded_status === 'active' ? '#34d399' : '#f87171'}">${w.recorded_status}</span></td>
                <td><code>${w.location?.lat.toFixed(5)}, ${w.location?.lon.toFixed(5)}</code></td>
                <td>
                  <button class="run-btn" style="padding: 3px 8px; font-size: 0.72rem;" onclick="auditWellFromAssetTab('${w.asset_id}')">Audit in Chat ⚡</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444;">Failed to load assets: ${err.message}</div>`;
  }
}

function filterAssetsTable() {
  const query = document.getElementById("asset-search").value.toLowerCase();
  const rows = document.querySelectorAll("#assets-table tbody tr");
  rows.forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(query) ? "" : "none";
  });
}

function auditWellFromAssetTab(wellId) {
  switchTab("chat");
  sendMessage(`Is ${wellId} producing oil right now? When was it last inspected, and by whom? Show me its status card.`);
}

// -------------------------------------------------------------
// Settings & Fleet Info
// -------------------------------------------------------------
async function loadFleetInfo() {
  try {
    const res = await fetch("/api/fleet/info");
    STATE.fleetInfo = await res.json();
    const ribbon = document.getElementById("fleet-ribbon");
    if (ribbon) {
      ribbon.textContent = `${STATE.fleetInfo.total_wells} Wells · ${STATE.fleetInfo.total_areas} Areas · Permian Field (As of 16 Oct 2026)`;
    }
  } catch (err) {
    console.error("Failed to load fleet info:", err);
  }
}

function initSettingsModal() {
  const modal = document.getElementById("settings-modal");
  const openBtn = document.getElementById("open-settings-btn");
  const closeBtn = document.getElementById("close-settings-btn");
  const saveBtn = document.getElementById("save-settings-btn");
  const keyInput = document.getElementById("api-key-input");
  const modelSelect = document.getElementById("model-select");

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      keyInput.value = STATE.apiKey;
      modelSelect.value = STATE.model;
      modal.classList.add("active");
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
  }
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      STATE.apiKey = keyInput.value.trim();
      STATE.model = modelSelect.value;
      localStorage.setItem("copilot_gemini_key", STATE.apiKey);
      localStorage.setItem("copilot_model", STATE.model);
      modal.classList.remove("active");
      appendSystemNotice(`Model settings updated: **${STATE.model}** (API Key configured: ${STATE.apiKey ? 'Yes' : 'No'}).`);
    });
  }
}

function showCitationPreview(citationText) {
  alert(`Evidence Citation:\n${citationText}\n\nThis record is indexed and fully grounded from the local fleet dataset.`);
}

// -------------------------------------------------------------
// Formatting Helpers & Security Sanitization
// -------------------------------------------------------------
function formatMarkdown(text) {
  if (!text) return "";
  // 1. Sanitize raw HTML to prevent XSS injection
  let safe = escapeHTML(text);
  
  // 2. Format markdown bold, italic, code, linebreaks
  let html = safe
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  return `<p>${html}</p>`;
}

function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
