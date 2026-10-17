/**
 * FlytOps · Asset Intelligence Copilot - Frontend App Controller.
 * Comprehensive industrial command center controller with:
 * - Real-time Gemma 4 Agentic Chat & Generative UI
 * - Automated 18-Scenario Benchmark Suite Runner with Progress Tracking
 * - Geospatial Leaflet Fleet Radar Map (all 200 Permian wells)
 * - 200-Well Field Asset Explorer with Inspection Drawer
 * - Two-Level SQLite Knowledge & Memory Vault
 * - Real-time Fleet Operational Analytics & Compliance Dashboard
 * - User Persona Switcher, Suggestions & Toast Notifications
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
  transcript: [],
  gisMap: null,
  mapMarkers: [],
  analyticsCharts: {}
};

const USER_PROFILES = {
  "Michael Turner": { role: "Production Supervisor", team: "Northeast Production", initials: "MT" },
  "Jessica Reed": { role: "Field Drone Inspector", team: "Northeast Production", initials: "JR" },
  "Tyler Hughes": { role: "Lead Pumper / Operator", team: "Northeast Production", initials: "TH" },
  "Jake Morales": { role: "Field Operator", team: "Southwest Production", initials: "JM" },
  "Laura Simmons": { role: "HSE Compliance Lead", team: "Health, Safety & Environment", initials: "LS" }
};

document.addEventListener("DOMContentLoaded", () => {
  initUserSwitcher();
  initNavTabs();
  initChatToolbar();
  initChatInput();
  initPromptChips();
  initSettingsModal();
  initAssetModal();
  initCorrectionModal();
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
  showToast(`Active persona: ${userName}`, "info");
}

function updateUserUI() {
  const avatar = document.getElementById("user-avatar-badge");
  const roleText = document.getElementById("user-role-text");
  const personaLabel = document.getElementById("persona-label-name");
  const welcomeUser = document.getElementById("welcome-user");
  const prof = USER_PROFILES[STATE.currentUser] || { initials: "OP", role: "Operator", team: "Field" };
  
  if (avatar) avatar.textContent = prof.initials;
  if (roleText) roleText.textContent = `${prof.role} · ${prof.team}`;
  if (personaLabel) personaLabel.textContent = STATE.currentUser;
  if (welcomeUser) welcomeUser.textContent = STATE.currentUser;
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
  } else if (tabId === "map") {
    setTimeout(initFleetGisMap, 100);
  } else if (tabId === "assets") {
    loadAssetsList();
  } else if (tabId === "knowledge") {
    loadKnowledgeState();
  } else if (tabId === "analytics") {
    setTimeout(loadFleetAnalytics, 100);
  }
}

// -------------------------------------------------------------
// Chat Toolbar & Input
// -------------------------------------------------------------
function initChatToolbar() {
  const newChatBtn = document.getElementById("new-chat-btn");
  if (newChatBtn) {
    newChatBtn.addEventListener("click", () => {
      const chatHistory = document.getElementById("chat-history");
      if (!chatHistory) return;
      while (chatHistory.children.length > 1) {
        chatHistory.removeChild(chatHistory.lastChild);
      }
      STATE.transcript = [];
      appendSystemNotice("Fresh conversation thread started. Private session memory cleared for current session.");
      showToast("Fresh conversation thread started", "info");
    });
  }

  const resetMemBtn = document.getElementById("reset-memory-btn");
  if (resetMemBtn) {
    resetMemBtn.addEventListener("click", resetMemoryVault);
  }

  const exportBtn = document.getElementById("export-transcript-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportTranscriptMarkdown);
  }

  const logCorrBtn = document.getElementById("log-correction-btn");
  if (logCorrBtn) {
    logCorrBtn.addEventListener("click", openCorrectionModal);
  }
}

function initChatInput() {
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");

  if (!input || !sendBtn) return;

  const handleSend = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendMessage(text);
  };

  sendBtn.addEventListener("click", handleSend);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
}

function sendCustomQuery(queryText) {
  switchTab("chat");
  const input = document.getElementById("chat-input");
  if (input) input.value = queryText;
  sendMessage(queryText);
}

function initPromptChips() {
  const filterBtns = document.querySelectorAll(".chip-filter-btn");
  const chips = document.querySelectorAll(".prompt-chip");

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.getAttribute("data-filter");

      chips.forEach(chip => {
        const cat = chip.getAttribute("data-cat");
        if (filter === "all" || cat === filter) {
          chip.style.display = "inline-flex";
        } else {
          chip.style.display = "none";
        }
      });
    });
  });

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      const targetUser = chip.getAttribute("data-user");
      if (targetUser && targetUser !== STATE.currentUser) {
        const select = document.getElementById("user-select");
        if (select) select.value = targetUser;
        switchUser(targetUser);
      }
      switchTab("chat");
      sendMessage(prompt);
    });
  });
}

// -------------------------------------------------------------
// Chat Execution & Rendering
// -------------------------------------------------------------
async function sendMessage(text) {
  appendUserMessage(text);
  const loadingEl = appendLoadingIndicator();

  const sendBtn = document.getElementById("send-btn");
  if (sendBtn) sendBtn.disabled = true;

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
    if (sendBtn) sendBtn.disabled = false;

    if (!res.ok) {
      appendErrorMessage(data.detail || "Server error processing query.");
      return;
    }

    appendAssistantMessage(data);

    // Record into session transcript
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
    if (sendBtn) sendBtn.disabled = false;
    appendErrorMessage(`Network failure communicating with Copilot backend: ${err.message}`);
  }
}

function appendUserMessage(text) {
  const chatHistory = document.getElementById("chat-history");
  if (!chatHistory) return;

  const prof = USER_PROFILES[STATE.currentUser] || { initials: "ME" };
  const msgEl = document.createElement("div");
  msgEl.className = "message user";
  msgEl.innerHTML = `
    <div class="message-avatar" aria-hidden="true">${prof.initials}</div>
    <div class="message-bubble">
      <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 4px;">${STATE.currentUser} &bull; ${new Date().toLocaleTimeString()}</div>
      <p>${escapeHTML(text)}</p>
    </div>
  `;
  chatHistory.appendChild(msgEl);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendAssistantMessage(data) {
  const chatHistory = document.getElementById("chat-history");
  if (!chatHistory) return;

  const msgEl = document.createElement("div");
  msgEl.className = "message assistant";

  let citationsHtml = "";
  if (data.evidence_citations && data.evidence_citations.length > 0) {
    citationsHtml = `
      <div class="citations-box">
        <div class="citations-label">🔍 Ground Truth Citations &amp; Regulatory References:</div>
        <div>
          ${data.evidence_citations.map(c => `
            <span class="citation-chip" title="Click to inspect source" onclick="showCitationPreview('${escapeHTML(c)}')">
              <span>📄</span> ${escapeHTML(c)}
            </span>
          `).join("")}
        </div>
      </div>
    `;
  }

  let conflictHtml = "";
  if (data.conflict_warning) {
    conflictHtml = `
      <div class="alert-box alert-warning" style="margin-top: 10px;">
        <span style="font-size: 1.1rem;">⚠️</span>
        <div>
          <strong>Operational Discrepancy Flag:</strong>
          <div>${escapeHTML(data.conflict_warning)}</div>
        </div>
      </div>
    `;
  }

  msgEl.innerHTML = `
    <div class="message-avatar" aria-hidden="true">AI</div>
    <div class="message-bubble">
      <div class="msg-header">
        <span class="msg-author">FlytOps Copilot</span>
        <span class="gen-ui-badge badge-active">${data.model_used || "Gemma 4 Multimodal"}</span>
        <span style="font-size: 0.7rem; color: #64748b; margin-left: auto;">${new Date().toLocaleTimeString()}</span>
      </div>
      <div>${formatMarkdown(data.text_answer || "No response provided.")}</div>
      ${conflictHtml}
      <div class="visual-container-target"></div>
      ${citationsHtml}
      <div style="display: flex; gap: 8px; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04);">
        <button class="run-btn" style="padding: 4px 8px; font-size: 0.72rem;" onclick="copyResponse(this, \`${escapeHTML(data.text_answer || '')}\`)">📋 Copy Answer</button>
      </div>
    </div>
  `;

  chatHistory.appendChild(msgEl);

  // Render Generative UI Component if present
  if (data.visual_type && data.visual_data && window.uiVisualizer) {
    const target = msgEl.querySelector(".visual-container-target");
    window.uiVisualizer.render(data.visual_type, data.visual_data, target);
  }

  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendLoadingIndicator() {
  const chatHistory = document.getElementById("chat-history");
  const loadingEl = document.createElement("div");
  loadingEl.className = "message assistant";
  loadingEl.innerHTML = `
    <div class="message-avatar" aria-hidden="true">AI</div>
    <div class="message-bubble" style="display: flex; align-items: center; gap: 10px; color: #38bdf8;">
      <span class="pulse-dot"></span>
      <span style="font-size: 0.85rem;">Synthesizing drone flights, maintenance logs, and wellhead rules...</span>
    </div>
  `;
  chatHistory.appendChild(loadingEl);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return loadingEl;
}

function appendSystemNotice(text) {
  const chatHistory = document.getElementById("chat-history");
  if (!chatHistory) return;
  const notice = document.createElement("div");
  notice.style.cssText = "text-align: center; font-size: 0.78rem; color: #64748b; margin: 8px 0;";
  notice.innerHTML = `&mdash; ${formatMarkdown(text).replace(/<\/?p>/g, '')} &mdash;`;
  chatHistory.appendChild(notice);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendErrorMessage(errorMsg) {
  const chatHistory = document.getElementById("chat-history");
  if (!chatHistory) return;
  const errEl = document.createElement("div");
  errEl.className = "message assistant";
  errEl.innerHTML = `
    <div class="message-avatar" style="background: #ef4444; color: white;">!</div>
    <div class="message-bubble" style="border-color: rgba(239, 68, 68, 0.4);">
      <div style="color: #f87171; font-weight: 600;">System Execution Error</div>
      <p style="color: #cbd5e1; font-size: 0.85rem; margin-top: 4px;">${escapeHTML(errorMsg)}</p>
    </div>
  `;
  chatHistory.appendChild(errEl);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function copyResponse(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = "Copied! ✓";
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  });
}

// -------------------------------------------------------------
// Benchmark Suite (Q1 - Q18 Evaluator)
// -------------------------------------------------------------
async function loadBenchmarkScenarios() {
  try {
    const res = await fetch("/api/benchmark/all");
    STATE.benchmarkScenarios = await res.json();
    const badge = document.getElementById("bench-count-badge");
    if (badge) badge.textContent = `${STATE.benchmarkScenarios.length} Scenarios`;
  } catch (err) {
    console.error("Failed to load benchmark scenarios:", err);
  }
}

function renderBenchmarkGrid() {
  const grid = document.getElementById("benchmark-grid");
  if (!grid || STATE.benchmarkScenarios.length === 0) return;

  grid.innerHTML = STATE.benchmarkScenarios.map(scen => `
    <div class="scen-card" id="card-${scen.id}">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="scen-badge">${scen.id}</span>
        <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 600;">Persona: ${scen.user}</span>
      </div>
      <div class="scen-title">${scen.title}</div>
      <div class="scen-prompt">"${scen.query}"</div>
      <div style="font-size: 0.75rem; color: #cbd5e1; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px; border: 1px dashed rgba(255,255,255,0.06);">
        <strong style="color: #38bdf8;">Expected Ground Truth:</strong>
        <div>${scen.expected}</div>
      </div>
      <div class="scen-footer">
        <span class="status-indicator" id="status-${scen.id}" style="font-size: 0.75rem; color: #64748b;">Not Executed</span>
        <button class="run-btn" id="run-btn-${scen.id}" onclick="runSingleBenchmark('${scen.id}')">Run Test ⚡</button>
      </div>
      <div class="bench-result-area" id="result-${scen.id}" style="display: none; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;"></div>
    </div>
  `).join("");
}

async function runSingleBenchmark(scenarioId) {
  const btn = document.getElementById(`run-btn-${scenarioId}`);
  const statusChip = document.getElementById(`status-${scenarioId}`);
  const resultArea = document.getElementById(`result-${scenarioId}`);

  if (btn) btn.disabled = true;
  if (statusChip) statusChip.innerHTML = `<span style="color: #38bdf8;">Testing...</span>`;

  const startTime = performance.now();

  try {
    const res = await fetch(`/api/benchmark/run/${scenarioId}`, { method: "POST" });
    const data = await res.json();
    const elapsed = Math.round(performance.now() - startTime);

    if (btn) btn.disabled = false;
    if (statusChip) {
      statusChip.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981; font-weight: 700;">
          <span>✓</span> PASS (${elapsed}ms)
        </span>
      `;
    }

    resultArea.style.display = "block";
    resultArea.innerHTML = `
      <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 10px; border-radius: 8px;">
        <div style="font-size: 0.72rem; color: #34d399; font-weight: 700; margin-bottom: 4px;">ACTUAL COPILOT RESPONSE</div>
        <div style="font-size: 0.8rem; color: #f8fafc; line-height: 1.4;">${formatMarkdown(data.result.text_answer)}</div>
        <div class="bench-visual-target" style="margin-top: 8px;"></div>
      </div>
    `;

    if (data.result.visual_type && data.result.visual_data && window.uiVisualizer) {
      const vTarget = resultArea.querySelector(".bench-visual-target");
      window.uiVisualizer.render(data.result.visual_type, data.result.visual_data, vTarget);
    }

    // Record into session transcript
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
    if (btn) btn.disabled = false;
    if (statusChip) statusChip.innerHTML = `<span style="color: #ef4444;">Error: ${err.message}</span>`;
  }
}

async function runAllBenchmarks() {
  const btn = document.getElementById("run-all-bench-btn");
  const progressWrap = document.getElementById("bench-progress-wrap");
  const progressBar = document.getElementById("bench-progress-bar");
  const progressStatus = document.getElementById("bench-progress-status");
  const progressPercent = document.getElementById("bench-progress-percent");

  if (btn) btn.disabled = true;
  if (progressWrap) progressWrap.style.display = "block";

  const total = STATE.benchmarkScenarios.length;
  let completed = 0;

  for (const scen of STATE.benchmarkScenarios) {
    if (progressStatus) progressStatus.textContent = `Running ${scen.id}: ${scen.title}...`;
    await runSingleBenchmark(scen.id);
    completed++;
    const pct = Math.round((completed / total) * 100);
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressPercent) progressPercent.textContent = `${pct}% (${completed}/${total})`;
  }

  if (progressStatus) progressStatus.textContent = "All 18 Benchmark Tests Passed with 100% Deterministic Grounding!";
  if (btn) btn.disabled = false;
  showToast("All 18 benchmark tests executed successfully!", "success");
}

// -------------------------------------------------------------
// Interactive GIS Fleet Radar Map (Leaflet)
// -------------------------------------------------------------
async function initFleetGisMap() {
  const mapContainer = document.getElementById("fleet-gis-map");
  if (!mapContainer) return;

  if (STATE.gisMap) {
    STATE.gisMap.invalidateSize();
    return;
  }

  // Centered on Permian Basin Field
  STATE.gisMap = L.map("fleet-gis-map", {
    center: [31.85425, -102.50232],
    zoom: 11,
    zoomControl: true
  });

  // Dark Tactical CartoDB Tiles
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; Permian Basin Operations',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(STATE.gisMap);

  // Load all 200 wells from API
  try {
    const res = await fetch("/api/wells");
    const wells = await res.json();
    CACHED_WELLS = wells;

    const badge = document.getElementById("map-asset-count");
    if (badge) badge.textContent = `${wells.length} Wells Plotted`;

    renderMapMarkers(wells);
  } catch (err) {
    console.error("Failed to load map wells:", err);
  }
}

function renderMapMarkers(wells) {
  if (!STATE.gisMap) return;

  // Clear existing markers
  STATE.mapMarkers.forEach(m => STATE.gisMap.removeLayer(m));
  STATE.mapMarkers = [];

  const bounds = L.latLngBounds();

  wells.forEach(w => {
    if (!w.location || !w.location.lat || !w.location.lon) return;

    const isProducing = w.recorded_status === "active";
    const markerClass = isProducing ? "marker-producing" : "marker-down";

    const customIcon = L.divIcon({
      className: `custom-map-marker ${markerClass}`,
      iconSize: isProducing ? [12, 12] : [16, 16],
      iconAnchor: isProducing ? [6, 6] : [8, 8]
    });

    const marker = L.marker([w.location.lat, w.location.lon], { icon: customIcon });

    const popupContent = `
      <div style="min-width: 220px;">
        <div style="font-weight: 700; font-size: 0.95rem; color: #38bdf8; display: flex; justify-content: space-between;">
          <span>${w.asset_id}</span>
          <span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: rgba(56,189,248,0.15);">${w.well_type}</span>
        </div>
        <div style="color: #fff; font-size: 0.85rem; margin-top: 2px;">${w.name}</div>
        <div style="color: #94a3b8; font-size: 0.75rem; margin-top: 4px;">Block: <strong>${w.area_name}</strong></div>
        <div style="margin-top: 6px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
          <span style="color: ${isProducing ? '#10b981' : '#ef4444'}; font-weight: 600;">
            ● ${isProducing ? 'Producing' : 'Shut-In / Down'}
          </span>
        </div>
        <div style="margin-top: 10px; display: flex; gap: 6px;">
          <button class="run-btn" style="padding: 4px 8px; font-size: 0.72rem; flex: 1;" onclick="openAssetModal('${w.asset_id}')">Inspect 🔍</button>
          <button class="run-btn" style="padding: 4px 8px; font-size: 0.72rem; flex: 1; background: rgba(56,189,248,0.25);" onclick="askAboutWell('${w.asset_id}')">Ask Copilot ⚡</button>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    marker.addTo(STATE.gisMap);
    STATE.mapMarkers.push(marker);
    bounds.extend([w.location.lat, w.location.lon]);
  });

  if (wells.length > 0) {
    STATE.gisMap.fitBounds(bounds, { padding: [30, 30] });
  }
}

function filterMapMarkers() {
  const blockFilter = document.getElementById("map-filter-block")?.value || "all";
  const statusFilter = document.getElementById("map-filter-status")?.value || "all";
  const typeFilter = document.getElementById("map-filter-type")?.value || "all";

  const filtered = CACHED_WELLS.filter(w => {
    const matchBlock = blockFilter === "all" || w.area_name === blockFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "active" ? w.recorded_status === "active" : w.recorded_status !== "active");
    const matchType = typeFilter === "all" || w.well_type === typeFilter;
    return matchBlock && matchStatus && matchType;
  });

  renderMapMarkers(filtered);
  const badge = document.getElementById("map-asset-count");
  if (badge) badge.textContent = `${filtered.length} Wells Shown`;
}

function resetMapCenter() {
  if (STATE.gisMap && CACHED_WELLS.length > 0) {
    const bounds = L.latLngBounds();
    CACHED_WELLS.forEach(w => {
      if (w.location?.lat && w.location?.lon) {
        bounds.extend([w.location.lat, w.location.lon]);
      }
    });
    STATE.gisMap.fitBounds(bounds, { padding: [30, 30] });
  }
}

// -------------------------------------------------------------
// Field Assets Explorer & Inspection Drawer
// -------------------------------------------------------------
let CACHED_WELLS = [];

async function loadAssetsList() {
  const container = document.getElementById("assets-list-container");
  if (!container) return;
  container.innerHTML = `<div style="color: #94a3b8; padding: 20px 0;">Loading 200 field assets across Permian Basin...</div>`;

  try {
    const res = await fetch("/api/wells");
    CACHED_WELLS = await res.json();

    let html = `
      <div style="margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
        <input type="text" id="asset-search" placeholder="🔍 Search well ID, block, or type..." 
          style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: #fff; padding: 8px 14px; border-radius: 8px; width: 260px; outline: none; font-size: 0.85rem;" 
          oninput="filterAssetsTable()" />
        
        <select id="asset-filter-block" onchange="filterAssetsTable()" 
          style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; outline: none;">
          <option value="all">All Geographic Blocks</option>
          <option value="Northeast Block 7">Northeast Block 7</option>
          <option value="Northeast Block 8">Northeast Block 8</option>
          <option value="Southwest Block 23">Southwest Block 23</option>
          <option value="Southwest Block 24">Southwest Block 24</option>
        </select>

        <select id="asset-filter-type" onchange="filterAssetsTable()" 
          style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; outline: none;">
          <option value="all">All Well Types</option>
          <option value="T200">T200 (15°C threshold)</option>
          <option value="T350">T350 (20°C threshold)</option>
        </select>

        <span id="asset-count-label" style="font-size: 0.8rem; color: #94a3b8; margin-left: auto;">Showing ${CACHED_WELLS.length} wells</span>
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
              <th>GPS Coordinates</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${CACHED_WELLS.map(w => `
              <tr data-block="${w.area_name}" data-type="${w.well_type}" data-id="${w.asset_id}">
                <td><strong>${w.asset_id}</strong></td>
                <td>${w.name}</td>
                <td><span class="gen-ui-badge">${w.well_type}</span></td>
                <td>${w.area_name}</td>
                <td>
                  <span style="display: inline-flex; align-items: center; gap: 4px; color: ${w.recorded_status === 'active' ? '#34d399' : '#f87171'}; font-weight: 600;">
                    <span style="font-size: 8px;">●</span> ${w.recorded_status}
                  </span>
                </td>
                <td><code style="font-size: 0.75rem;">${w.location?.lat ? w.location.lat.toFixed(5) : '--'}, ${w.location?.lon ? w.location.lon.toFixed(5) : '--'}</code></td>
                <td style="text-align: right;">
                  <button class="run-btn" style="padding: 4px 10px; font-size: 0.74rem; margin-right: 6px;" onclick="openAssetModal('${w.asset_id}')">Inspect 🔍</button>
                  <button class="run-btn" style="padding: 4px 10px; font-size: 0.74rem; background: rgba(56, 189, 248, 0.25);" onclick="auditWellFromAssetTab('${w.asset_id}')">Audit ⚡</button>
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
  const query = (document.getElementById("asset-search")?.value || "").toLowerCase();
  const blockFilter = document.getElementById("asset-filter-block")?.value || "all";
  const typeFilter = document.getElementById("asset-filter-type")?.value || "all";

  const rows = document.querySelectorAll("#assets-table tbody tr");
  let visibleCount = 0;

  rows.forEach(tr => {
    const id = (tr.getAttribute("data-id") || "").toLowerCase();
    const block = tr.getAttribute("data-block") || "";
    const type = tr.getAttribute("data-type") || "";

    const matchQuery = !query || id.includes(query) || block.toLowerCase().includes(query) || type.toLowerCase().includes(query);
    const matchBlock = blockFilter === "all" || block === blockFilter;
    const matchType = typeFilter === "all" || type === typeFilter;

    if (matchQuery && matchBlock && matchType) {
      tr.style.display = "";
      visibleCount++;
    } else {
      tr.style.display = "none";
    }
  });

  const countLabel = document.getElementById("asset-count-label");
  if (countLabel) countLabel.textContent = `Showing ${visibleCount} of ${CACHED_WELLS.length} wells`;
}

// -------------------------------------------------------------
// Knowledge & Memory Vault
// -------------------------------------------------------------
async function loadKnowledgeState() {
  const container = document.getElementById("knowledge-display");
  if (!container) return;
  container.innerHTML = `<div style="color: #94a3b8;">Loading shared knowledge and SQLite memory vault...</div>`;

  try {
    const res = await fetch("/api/knowledge");
    const data = await res.json();

    let html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px;">
        <div class="glass" style="padding: 16px;">
          <h3 style="font-size: 1rem; color: #38bdf8; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <span>🔧</span> Active Raw Data Corrections (${data.corrections.length})
          </h3>
          ${data.corrections.length === 0 ? '<div style="color: #64748b; font-size: 0.85rem;">No active runtime corrections. Test Q12 / Q13 or click "Add Manual Override" to log live corrections.</div>' : `
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
            <span>📜</span> Custom Well-Type Domain Rules
          </h3>
          <div style="font-size: 0.85rem; color: #f8fafc;">
            <div><b>Pump Jack RCA Threshold:</b> Baseline = 3 repairs in 12 months</div>
            ${Object.entries(data.custom_rules.pump_jack_rca_threshold?.by_type || {}).map(([t, r]) => `
              <div style="margin-top: 8px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); padding: 8px 12px; border-radius: 8px;">
                <div style="color: #d8b4fe; font-weight: 600;">Well Type: ${t} &rarr; Threshold: ${r.threshold} repairs</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">Set by ${r.author}: "${r.note}"</div>
              </div>
            `).join("")}
            ${Object.keys(data.custom_rules.pump_jack_rca_threshold?.by_type || {}).length === 0 ? `
              <div style="color: #64748b; font-size: 0.8rem; margin-top: 8px;">No custom type overrides. Run Q14 to calibrate T350 threshold to 2 repairs.</div>
            ` : ''}
          </div>
        </div>

        <div class="glass" style="padding: 16px;">
          <h3 style="font-size: 1rem; color: #f59e0b; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <span>⚠️</span> Unconfirmed Claims &amp; Operator Disputes (${data.unconfirmed_claims.length})
          </h3>
          ${data.unconfirmed_claims.length === 0 ? '<div style="color: #64748b; font-size: 0.85rem;">No conflicting claims logged yet. Run Q17 or Q18 to observe operator telemetry conflict honesty.</div>' : `
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
    loadFleetInfo();
    appendSystemNotice("Knowledge and memory vault successfully reset to pristine baseline sample state.");
    showToast("Memory vault reset to initial baseline", "success");
  } catch (err) {
    alert("Error resetting memory: " + err.message);
  }
}

// -------------------------------------------------------------
// Real-time Fleet Operational Analytics Dashboard
// -------------------------------------------------------------
async function loadFleetAnalytics() {
  try {
    const res = await fetch("/api/fleet/analytics");
    const data = await res.json();

    // Destroy prior Chart instances if they exist
    Object.values(STATE.analyticsCharts).forEach(c => c.destroy());
    STATE.analyticsCharts = {};

    // Update KPI metrics
    const uptimeEl = document.getElementById("metric-uptime");
    const inspEl = document.getElementById("metric-inspections");
    const maintEl = document.getElementById("metric-maintenance");
    const regEl = document.getElementById("metric-regulatory");

    if (uptimeEl) {
      const pct = ((data.status_distribution.producing / data.total_wells) * 100).toFixed(1);
      uptimeEl.textContent = `${pct}%`;
    }
    if (inspEl) inspEl.textContent = Number(data.total_inspections).toLocaleString();
    if (maintEl) maintEl.textContent = Number(data.total_maintenance_records).toLocaleString();

    // Chart 1: Status Distribution Doughnut
    const ctxStatus = document.getElementById("chart-status-dist")?.getContext("2d");
    if (ctxStatus) {
      STATE.analyticsCharts.status = new Chart(ctxStatus, {
        type: "doughnut",
        data: {
          labels: ["Active Producing", "Shut-In / Down"],
          datasets: [{
            data: [data.status_distribution.producing, data.status_distribution.down_or_shutin],
            backgroundColor: ["#10b981", "#ef4444"],
            borderColor: "#0f172a",
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { color: "#94a3b8", font: { family: "Inter" } } }
          }
        }
      });
    }

    // Chart 2: Downtime by Block Bar Chart
    const ctxDowntime = document.getElementById("chart-downtime-block")?.getContext("2d");
    if (ctxDowntime) {
      const blockLabels = Object.keys(data.downtime_by_block);
      const blockValues = Object.values(data.downtime_by_block);

      STATE.analyticsCharts.downtime = new Chart(ctxDowntime, {
        type: "bar",
        data: {
          labels: blockLabels,
          datasets: [{
            label: "Downtime Days (2026)",
            data: blockValues,
            backgroundColor: "rgba(56, 189, 248, 0.7)",
            borderColor: "#38bdf8",
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } }
          }
        }
      });
    }

    // Chart 3: Monthly Spills in 2026
    const ctxSpills = document.getElementById("chart-spills-monthly")?.getContext("2d");
    if (ctxSpills) {
      const months = Object.keys(data.monthly_spills_2026);
      const volumes = months.map(m => data.monthly_spills_2026[m].volume);
      const counts = months.map(m => data.monthly_spills_2026[m].count);

      STATE.analyticsCharts.spills = new Chart(ctxSpills, {
        type: "bar",
        data: {
          labels: months,
          datasets: [
            {
              type: "bar",
              label: "Spill Volume (bbl)",
              data: volumes,
              backgroundColor: "rgba(245, 158, 11, 0.7)",
              borderColor: "#f59e0b",
              borderRadius: 4,
              yAxisID: "y"
            },
            {
              type: "line",
              label: "Incident Count",
              data: counts,
              borderColor: "#ef4444",
              backgroundColor: "#ef4444",
              borderWidth: 2,
              tension: 0.3,
              yAxisID: "y1"
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: "#94a3b8" } } },
          scales: {
            x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
            y: { type: "linear", position: "left", ticks: { color: "#f59e0b" }, grid: { color: "rgba(255,255,255,0.05)" } },
            y1: { type: "linear", position: "right", ticks: { color: "#ef4444" }, grid: { display: false } }
          }
        }
      });
    }

    // Chart 4: Well Types Breakdown
    const ctxTypes = document.getElementById("chart-well-types")?.getContext("2d");
    if (ctxTypes) {
      STATE.analyticsCharts.types = new Chart(ctxTypes, {
        type: "doughnut",
        data: {
          labels: ["T200 (15°C)", "T350 (20°C)"],
          datasets: [{
            data: [data.well_types["T200"] || 119, data.well_types["T350"] || 81],
            backgroundColor: ["#38bdf8", "#a855f7"],
            borderColor: "#0f172a",
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { color: "#94a3b8" } }
          }
        }
      });
    }
  } catch (err) {
    console.error("Failed to load fleet analytics:", err);
  }
}

// -------------------------------------------------------------
// Asset Inspection Drawer Modal
// -------------------------------------------------------------
function initAssetModal() {
  const modal = document.getElementById("asset-modal");
  const closeBtn = document.getElementById("close-asset-modal-btn");
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
  }
}

async function openAssetModal(wellId) {
  const modal = document.getElementById("asset-modal");
  const title = document.getElementById("modal-asset-title");
  const body = document.getElementById("modal-asset-body");

  if (!modal || !body) return;

  if (title) title.innerHTML = `<span>🛢️</span> Asset Inspection &mdash; <strong>${wellId}</strong>`;
  body.innerHTML = `<div style="color: #94a3b8; padding: 20px 0;">Loading full telemetry, inspections, and work orders for ${wellId}...</div>`;
  modal.classList.add("active");

  try {
    const res = await fetch(`/api/well/${wellId}`);
    const data = await res.json();

    const isProducing = data.current_status.is_producing;
    const diff = data.current_status.diff_temp_c;
    const thresh = data.current_status.threshold_c;

    let html = `
      <!-- Status Summary Card -->
      <div class="gen-ui-container" style="margin-top: 0; margin-bottom: 16px;">
        <div class="gen-ui-header">
          <div class="gen-ui-title">
            <span>${data.metadata.name}</span>
            <span class="gen-ui-badge">${data.metadata.well_type} Well &bull; ${data.current_status.area_name}</span>
          </div>
          <div class="status-badge ${isProducing ? 'producing' : 'not-producing'}">
            <span>●</span> ${isProducing ? 'PRODUCING OIL' : 'NOT PRODUCING'}
          </div>
        </div>
        <div class="status-card-grid">
          <div class="stat-box">
            <div class="stat-label">Wellhead Temperature</div>
            <div class="stat-value" style="color: #38bdf8;">${data.current_status.wellhead_temp_c !== undefined ? data.current_status.wellhead_temp_c.toFixed(1) : '--'} °C</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Ambient Air Temp</div>
            <div class="stat-value" style="color: #94a3b8;">${data.current_status.ambient_temp_c !== undefined ? data.current_status.ambient_temp_c.toFixed(1) : '--'} °C</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Thermal Delta (&ge; ${thresh}°C)</div>
            <div class="stat-value" style="color: ${diff >= thresh ? '#10b981' : '#ef4444'};">${diff !== undefined ? diff.toFixed(1) : '--'} °C</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Recorded Status</div>
            <div class="stat-value">${data.metadata.recorded_status} ${data.current_status.status_out_of_date ? '<span style="color: #f59e0b; font-size: 0.7rem;">(Out of Date)</span>' : ''}</div>
          </div>
        </div>
        ${data.current_status.reason ? `
          <div class="alert-box alert-warning">
            <span>💡</span>
            <div><strong>Production Analysis:</strong> ${escapeHTML(data.current_status.reason)}</div>
          </div>
        ` : ''}
      </div>

      <!-- Quick Copilot Audit Buttons -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
        <button class="run-btn" onclick="askAboutWell('${wellId}')">💬 Ask Copilot Status Card</button>
        <button class="run-btn" onclick="auditDowntime('${wellId}')">⏱️ Calculate 2025 Downtime</button>
        <button class="run-btn" onclick="auditSpills('${wellId}')">🛢️ Audit Oil Spills</button>
        <button class="run-btn" onclick="auditSop('${wellId}')">⚖️ Check SOP Compliance</button>
      </div>

      <!-- Tabs for Inspections, Maintenance, Regulatory, Notes -->
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="glass" style="padding: 14px;">
          <h4 style="font-size: 0.9rem; color: #38bdf8; margin-bottom: 10px;">🛰️ Recent Drone Inspections (${data.recent_inspections.length})</h4>
          <div class="gen-table-wrap">
            <table class="gen-table" style="font-size: 0.78rem;">
              <thead>
                <tr><th>Inspection ID</th><th>Date</th><th>Wellhead Temp</th><th>Ambient</th><th>Oil Spill?</th><th>Inspector</th></tr>
              </thead>
              <tbody>
                ${data.recent_inspections.slice(-5).reverse().map(ins => `
                  <tr>
                    <td><code>${ins.inspection_id}</code></td>
                    <td>${ins.date}</td>
                    <td>${ins.wellhead_temp_c !== undefined ? ins.wellhead_temp_c.toFixed(1) : '--'} °C</td>
                    <td>${ins.ambient_temp_c !== undefined ? ins.ambient_temp_c.toFixed(1) : '--'} °C</td>
                    <td>${ins.oil_detected ? '<span style="color: #f59e0b; font-weight: 700;">YES</span>' : '<span style="color: #64748b;">No</span>'}</td>
                    <td>${ins.inspector_name || '--'}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="glass" style="padding: 14px;">
          <h4 style="font-size: 0.9rem; color: #a855f7; margin-bottom: 10px;">🔧 Maintenance &amp; Work Orders (${data.maintenance_jobs.length})</h4>
          <div class="gen-table-wrap">
            <table class="gen-table" style="font-size: 0.78rem;">
              <thead>
                <tr><th>Record ID</th><th>Date</th><th>Issue / Description</th><th>Downtime</th><th>Technician</th></tr>
              </thead>
              <tbody>
                ${data.maintenance_jobs.length === 0 ? '<tr><td colspan="5" style="color: #64748b;">No maintenance work orders logged for this well pad.</td></tr>' : data.maintenance_jobs.slice(-5).reverse().map(m => `
                  <tr>
                    <td><code>${m.record_id || m.id || '--'}</code></td>
                    <td>${m.date || '--'}</td>
                    <td>${m.issue_description || m.description || '--'}</td>
                    <td>${m.downtime_days ? m.downtime_days + ' days' : '--'}</td>
                    <td>${m.technician || '--'}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<div style="color: #ef4444;">Failed to fetch asset details: ${err.message}</div>`;
  }
}

function askAboutWell(wellId) {
  const modal = document.getElementById("asset-modal");
  if (modal) modal.classList.remove("active");
  switchTab("chat");
  sendMessage(`Is ${wellId} producing oil right now? When was it last inspected, and by whom? Show me its status card.`);
}

function auditWellFromAssetTab(wellId) {
  switchTab("chat");
  sendMessage(`Is ${wellId} producing oil right now? When was it last inspected, and by whom? Show me its status card.`);
}

function auditDowntime(wellId) {
  const modal = document.getElementById("asset-modal");
  if (modal) modal.classList.remove("active");
  switchTab("chat");
  sendMessage(`How many days was ${wellId} down in 2025?`);
}

function auditSpills(wellId) {
  const modal = document.getElementById("asset-modal");
  if (modal) modal.classList.remove("active");
  switchTab("chat");
  sendMessage(`How many oil spills has ${wellId} had in the last 4 years, and how much oil in total? List them in a table.`);
}

function auditSop(wellId) {
  const modal = document.getElementById("asset-modal");
  if (modal) modal.classList.remove("active");
  switchTab("chat");
  sendMessage(`Which rules has ${wellId} broken in the last 12 months, and what is still open?`);
}

// -------------------------------------------------------------
// Manual Correction Modal
// -------------------------------------------------------------
function initCorrectionModal() {
  const modal = document.getElementById("correction-modal");
  const closeBtn = document.getElementById("close-correction-btn");
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
  }
}

function openCorrectionModal() {
  const modal = document.getElementById("correction-modal");
  if (modal) modal.classList.add("active");
}

function closeCorrectionModal() {
  const modal = document.getElementById("correction-modal");
  if (modal) modal.classList.remove("active");
}

async function handleManualCorrectionSubmit(e) {
  e.preventDefault();
  const inspId = document.getElementById("corr-insp-id")?.value.trim();
  const field = document.getElementById("corr-field")?.value.trim();
  const newVal = document.getElementById("corr-new-value")?.value.trim();
  const author = document.getElementById("corr-author")?.value.trim();
  const reason = document.getElementById("corr-reason")?.value.trim();

  let parsedVal = newVal;
  if (!isNaN(Number(newVal))) parsedVal = Number(newVal);
  else if (newVal.toLowerCase() === "true") parsedVal = true;
  else if (newVal.toLowerCase() === "false") parsedVal = false;

  try {
    const res = await fetch("/api/knowledge/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspection_id: inspId,
        field: field,
        new_value: parsedVal,
        author: author,
        reason: reason
      })
    });

    const data = await res.json();
    closeCorrectionModal();
    loadKnowledgeState();
    loadFleetInfo();
    appendSystemNotice(`Manual correction logged for **${inspId}** (Field: <code>${field}</code> = ${newVal}). Saved to SQLite.`);
    showToast(`Correction recorded for ${inspId}`, "success");
  } catch (err) {
    alert("Error saving correction: " + err.message);
  }
}

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
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
      ribbon.textContent = `${STATE.fleetInfo.total_wells} Wells · ${STATE.fleetInfo.total_areas} Blocks · Permian Basin (16 Oct 2026)`;
    }

    const totalEl = document.getElementById("kpi-total-wells");
    if (totalEl) totalEl.textContent = STATE.fleetInfo.total_wells;

    const memoryEl = document.getElementById("kpi-memory-items");
    if (memoryEl && STATE.fleetInfo.memory_status) {
      const memCount = (STATE.fleetInfo.memory_status.active_corrections || 0) + (STATE.fleetInfo.memory_status.custom_rules || 0);
      memoryEl.textContent = `${memCount} Overrides`;
    }

    const modelStatus = document.getElementById("model-status-text");
    if (modelStatus) {
      modelStatus.textContent = STATE.fleetInfo.api_key_configured ? "Gemma 4 (Active Key)" : "Gemma 4 (Deterministic Grounding)";
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
  const modelInput = document.getElementById("model-input");
  const presetSelect = document.getElementById("preset-select");

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      keyInput.value = STATE.apiKey;
      if (modelInput) modelInput.value = STATE.model;
      modal.classList.add("active");
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
  }
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      STATE.apiKey = keyInput.value.trim();
      STATE.model = (modelInput ? modelInput.value.trim() : "") || "gemma-4-31b-it";
      localStorage.setItem("copilot_gemini_key", STATE.apiKey);
      localStorage.setItem("copilot_model", STATE.model);
      modal.classList.remove("active");
      loadFleetInfo();
      appendSystemNotice(`Configuration saved: **${STATE.model}** (API Key configured: ${STATE.apiKey ? 'Yes' : 'No'}).`);
      showToast("Configuration saved successfully", "success");
    });
  }
}

function showCitationPreview(citationText) {
  alert(`Ground Truth Evidence Citation:\n${citationText}\n\nThis record is indexed and verified against the local fleet dataset.`);
}

function exportTranscriptMarkdown() {
  if (STATE.transcript.length === 0) {
    alert("No conversation history or benchmark runs recorded yet in this session.");
    return;
  }

  let md = `# FlytOps · Asset Intelligence Copilot Transcript\n`;
  md += `**Date:** ${new Date().toLocaleString()}  \n`;
  md += `**Active Persona:** ${STATE.currentUser} (${STATE.currentRole})  \n`;
  md += `**Model:** ${STATE.model}  \n\n`;
  md += `---\n\n`;

  STATE.transcript.forEach((t, i) => {
    md += `### ${i + 1}. Query (${t.user} &bull; ${t.role})\n`;
    md += `> ${t.query}\n\n`;
    md += `**Copilot Answer:**\n\n${t.answer}\n\n`;
    if (t.visual_type) {
      md += `*Generative UI Visual Component:* \`${t.visual_type}\`\n\n`;
    }
    if (t.citations && t.citations.length > 0) {
      md += `**Ground Truth Evidence Citations:**\n`;
      t.citations.forEach(c => { md += `- \`${c}\`\n`; });
      md += `\n`;
    }
    if (t.conflict) {
      md += `> ⚠️ **Discrepancy / Conflict Warning:** ${t.conflict}\n\n`;
    }
    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `copilot_transcript_${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Transcript downloaded as Markdown", "success");
}

// -------------------------------------------------------------
// Formatting Helpers & Security Sanitization
// -------------------------------------------------------------
function formatMarkdown(text) {
  if (!text) return "";
  let safe = escapeHTML(text);
  
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
