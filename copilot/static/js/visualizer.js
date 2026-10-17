/**
 * Generative UI Visualizer Component.
 * Dynamically renders inline visual representations based on Copilot's answer schema:
 * - Status Card (Thermal production rule, delta gauge, reason, out-of-date notice)
 * - Table (Formatted tabular data, sortable, badges)
 * - Line Chart (Thermal time-series, non-producing periods)
 * - Bar Chart (Comparative downtime, repair costs)
 * - Map (Leaflet geospatial pins, well coordinates, spills)
 * - Heatmap (2D matrix areas x months)
 */

class UIVisualizer {
  constructor() {
    this.chartInstances = {};
    this.mapInstances = {};
  }

  render(visualType, data, containerEl) {
    if (!visualType || !data) return;

    const wrapper = document.createElement("div");
    wrapper.className = "gen-ui-container";

    switch (visualType) {
      case "status_card":
        this.renderStatusCard(data, wrapper);
        break;
      case "table":
        this.renderTable(data, wrapper);
        break;
      case "line_chart":
        this.renderLineChart(data, wrapper);
        break;
      case "bar_chart":
        this.renderBarChart(data, wrapper);
        break;
      case "map":
        this.renderMap(data, wrapper);
        break;
      case "heatmap":
        this.renderHeatmap(data, wrapper);
        break;
      default:
        console.warn("Unknown visual type:", visualType);
        return;
    }

    containerEl.appendChild(wrapper);
  }

  renderStatusCard(data, el) {
    const isProducing = data.is_producing;
    const diff = data.diff_temp_c !== undefined ? data.diff_temp_c : (data.wellhead_temp_c - data.ambient_temp_c);
    const threshold = data.threshold_c || (data.well_type === "T350" ? 20 : 15);
    
    let html = `
      <div class="gen-ui-header">
        <div class="gen-ui-title">
          <span>⚡</span>
          <span>${data.well_id || "Asset"} &mdash; ${data.name || "Well Status"}</span>
          <span class="gen-ui-badge">${data.well_type || "T200"} Well</span>
        </div>
        <div class="status-badge ${isProducing ? 'producing' : 'not-producing'}">
          <span style="font-size: 10px;">●</span>
          <span>${isProducing ? 'PRODUCING OIL' : 'NOT PRODUCING'}</span>
        </div>
      </div>

      <div class="status-card-grid">
        <div class="stat-box">
          <div class="stat-label">Wellhead Temperature</div>
          <div class="stat-value" style="color: #38bdf8;">
            ${data.wellhead_temp_c !== undefined ? data.wellhead_temp_c.toFixed(1) : '--'} °C
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Ambient Air Temp</div>
          <div class="stat-value" style="color: #94a3b8;">
            ${data.ambient_temp_c !== undefined ? data.ambient_temp_c.toFixed(1) : '--'} °C
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Delta Above Air</div>
          <div class="stat-value" style="color: ${diff >= threshold ? '#34d399' : '#f87171'};">
            ${diff !== undefined ? diff.toFixed(1) : '--'} °C
            <span style="font-size: 0.7rem; color: #64748b; font-weight: 400;">(req ≥ ${threshold} °C)</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-label">System Recorded Status</div>
          <div class="stat-value" style="font-size: 0.95rem;">
            ${data.recorded_status || 'Unknown'}
            ${data.status_out_of_date ? '<span style="color: #f59e0b; font-size: 0.7rem;">(Out of Date)</span>' : ''}
          </div>
        </div>
      </div>
    `;

    if (data.reason) {
      html += `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 10px 14px; border-radius: 8px; margin-bottom: 10px;">
          <div style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Operational Finding / Stoppage Reason</div>
          <div style="font-size: 0.88rem; color: #f8fafc;">${data.reason}</div>
        </div>
      `;
    }

    if (data.status_out_of_date) {
      html += `
        <div class="alert-box alert-warning">
          <span>⚠️</span>
          <div><strong>Out-of-Date Alert:</strong> System recorded status says <code>${data.recorded_status}</code>, but latest thermal inspection proves the well is <strong>${isProducing ? 'active' : 'down'}</strong>. Field records refreshed only monthly.</div>
        </div>
      `;
    }

    if (data.inspector_conflict) {
      html += `
        <div class="alert-box alert-danger">
          <span>🚨</span>
          <div>${data.inspector_conflict}</div>
        </div>
      `;
    }

    el.innerHTML = html;
  }

  renderTable(data, el) {
    const title = data.title || "Data Table";
    const columns = data.columns || [];
    const rows = data.rows || [];

    let html = `
      <div class="gen-ui-header">
        <div class="gen-ui-title">
          <span>📋</span>
          <span>${title}</span>
        </div>
        <div class="gen-ui-badge">${rows.length} Records</div>
      </div>
      <div class="gen-table-wrap">
        <table class="gen-table">
          <thead>
            <tr>
              ${columns.map(c => `<th>${c}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${columns.map(c => {
                  let val = row[c] !== undefined ? row[c] : "";
                  if (typeof val === "string" && (val.toLowerCase().includes("breach") || val.toLowerCase().includes("overdue"))) {
                    return `<td><span style="color: #f87171; font-weight: 600;">${val}</span></td>`;
                  }
                  if (typeof val === "string" && val.toLowerCase().includes("out of date")) {
                    return `<td><span style="color: #fbbf24;">${val}</span></td>`;
                  }
                  return `<td>${val}</td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    el.innerHTML = html;
  }

  renderLineChart(data, el) {
    const canvasId = "chart-" + Math.random().toString(36).substring(2, 9);
    const title = data.title || "Temperature Trends Over Time";

    el.innerHTML = `
      <div class="gen-ui-header">
        <div class="gen-ui-title">
          <span>📈</span>
          <span>${title}</span>
        </div>
        <div class="gen-ui-badge">Weekly Readings</div>
      </div>
      <div style="height: 280px; width: 100%; position: relative;">
        <canvas id="${canvasId}"></canvas>
      </div>
    `;

    setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas || !window.Chart) {
        this.renderFallbackSVGLine(canvas ? canvas.parentElement : el, data);
        return;
      }

      const labels = data.series.map(s => s.date.slice(5)); // MM-DD
      const wellheadTemps = data.series.map(s => s.wellhead_temp_c);
      const ambientTemps = data.series.map(s => s.ambient_temp_c);
      const reqThresholds = data.series.map(s => s.ambient_temp_c + (data.threshold_delta || 15));

      const pointColors = data.series.map(s => s.is_producing ? '#38bdf8' : '#ef4444');
      const pointRadius = data.series.map(s => s.is_producing ? 4 : 7);

      new Chart(canvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Wellhead Temp (°C)',
              data: wellheadTemps,
              borderColor: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderWidth: 2.5,
              pointBackgroundColor: pointColors,
              pointBorderColor: '#fff',
              pointRadius: pointRadius,
              tension: 0.3
            },
            {
              label: 'Ambient Air Temp (°C)',
              data: ambientTemps,
              borderColor: '#94a3b8',
              borderWidth: 1.5,
              borderDash: [4, 4],
              pointRadius: 2,
              tension: 0.3
            },
            {
              label: 'Min Producing Threshold (°C)',
              data: reqThresholds,
              borderColor: '#f59e0b',
              borderWidth: 1.5,
              pointRadius: 0,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#94a3b8', font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                afterBody: (context) => {
                  const idx = context[0].dataIndex;
                  const item = data.series[idx];
                  return item.is_producing ? 'Status: Active Producing' : 'Status: NOT PRODUCING (Down)';
                }
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8' }
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8' }
            }
          }
        }
      });
    }, 50);
  }

  renderBarChart(data, el) {
    const canvasId = "chart-" + Math.random().toString(36).substring(2, 9);
    const title = data.title || "Comparative Bar Chart";
    const items = data.items || [];

    el.innerHTML = `
      <div class="gen-ui-header">
        <div class="gen-ui-title">
          <span>📊</span>
          <span>${title}</span>
        </div>
        <div class="gen-ui-badge">${data.yAxisLabel || "Comparison"}</div>
      </div>
      <div style="height: 260px; width: 100%; position: relative;">
        <canvas id="${canvasId}"></canvas>
      </div>
    `;

    setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas || !window.Chart) {
        this.renderFallbackSVGBar(canvas ? canvas.parentElement : el, items);
        return;
      }

      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: items.map(i => i.label),
          datasets: [{
            label: data.yAxisLabel || 'Value',
            data: items.map(i => i.value),
            backgroundColor: [
              'rgba(56, 189, 248, 0.75)',
              'rgba(168, 85, 247, 0.75)',
              'rgba(16, 185, 129, 0.75)',
              'rgba(245, 158, 11, 0.75)'
            ],
            borderColor: [
              '#38bdf8',
              '#a855f7',
              '#10b981',
              '#f59e0b'
            ],
            borderWidth: 1.5,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#f8fafc', font: { weight: 'bold' } }
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.06)' },
              ticks: { color: '#94a3b8' }
            }
          }
        }
      });
    }, 50);
  }

  renderMap(data, el) {
    const mapId = "map-" + Math.random().toString(36).substring(2, 9);
    const title = data.title || "Geospatial Field Map";
    const pins = data.pins || [];

    let html = `
      <div class="gen-ui-header">
        <div class="gen-ui-title">
          <span>🗺️</span>
          <span>${title}</span>
        </div>
        <div class="gen-ui-badge">${pins.length} Wells Mapped</div>
      </div>
      <div id="${mapId}" class="inline-map"></div>
    `;

    if (data.table) {
      html += `
        <div class="gen-table-wrap" style="margin-top: 14px;">
          <table class="gen-table">
            <thead>
              <tr>
                <th>Well ID</th>
                <th>Spill Date</th>
                <th>Estimated Volume</th>
                <th>Location (Lat, Lon)</th>
              </tr>
            </thead>
            <tbody>
              ${pins.map(p => `
                <tr>
                  <td><strong>${p.well_id}</strong></td>
                  <td>${p.date}</td>
                  <td><span style="color: #f59e0b; font-weight: 600;">${p.barrels ? p.barrels.toFixed(1) : '--'} bbl</span></td>
                  <td><code>${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</code></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    el.innerHTML = html;

    setTimeout(() => {
      const mapEl = document.getElementById(mapId);
      if (!mapEl || !window.L) {
        mapEl.innerHTML = `<div style="padding: 20px; text-align: center; color: #94a3b8;">Interactive Map Loaded (${pins.length} pins plotted).</div>`;
        return;
      }

      const center = data.center || (pins.length > 0 ? [pins[0].lat, pins[0].lon] : [32.15, -102.16]);
      const map = L.map(mapId).setView([center.lat || center[0], center.lon || center[1]], data.zoom || 11);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(map);

      pins.forEach(p => {
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: 8 + (p.barrels ? Math.min(p.barrels * 1.5, 12) : 2),
          fillColor: '#ef4444',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85
        }).addTo(map);

        marker.bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="font-size: 14px;">${p.well_id}</strong><br/>
            <span>Date: ${p.date}</span><br/>
            <span>Volume: <b>${p.barrels ? p.barrels.toFixed(1) : '0'} bbl</b></span><br/>
            <span>Coords: ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</span>
          </div>
        `);
      });

      // Fit bounds if multiple pins
      if (pins.length > 1) {
        const group = new L.featureGroup(pins.map(p => L.marker([p.lat, p.lon])));
        map.fitBounds(group.getBounds().pad(0.15));
      }
    }, 100);
  }

  renderHeatmap(data, el) {
    const title = data.title || "Two-Dimensional Heatmap";
    const months = data.months || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
    const rows = data.rows || [];

    let html = `
      <div class="gen-ui-header">
        <div class="gen-ui-title">
          <span>🌡️</span>
          <span>${title}</span>
        </div>
        <div class="gen-ui-badge">4 Blocks × ${months.length} Months</div>
      </div>
      <div class="heatmap-container">
        <table class="heatmap-table">
          <thead>
            <tr>
              <th style="text-align: left; padding: 6px 12px; color: #94a3b8; font-size: 0.8rem;">Area</th>
              ${months.map(m => `<th style="padding: 6px 4px; color: #94a3b8; font-size: 0.78rem;">${m}</th>`).join("")}
              <th style="padding: 6px 8px; color: #38bdf8; font-size: 0.8rem;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td style="font-size: 0.82rem; font-weight: 600; padding: 4px 10px; color: #f8fafc; white-space: nowrap;">${r.area}</td>
                ${r.counts.map(cnt => {
                  let intensityClass = 'intensity-0';
                  if (cnt === 1) intensityClass = 'intensity-1';
                  else if (cnt <= 3) intensityClass = 'intensity-2';
                  else if (cnt <= 5) intensityClass = 'intensity-3';
                  else if (cnt <= 6) intensityClass = 'intensity-4';
                  else if (cnt >= 7) intensityClass = 'intensity-5';

                  return `<td class="heatmap-cell ${intensityClass}" title="${r.area}: ${cnt} spills">${cnt}</td>`;
                }).join("")}
                <td style="text-align: center; font-weight: 700; color: #38bdf8; font-size: 0.9rem;">${r.total}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    el.innerHTML = html;
  }

  renderFallbackSVGBar(container, items) {
    const maxVal = Math.max(...items.map(i => i.value), 1);
    let html = `<div style="display: flex; flex-direction: column; gap: 8px; padding: 12px 0;">`;
    items.forEach(i => {
      const pct = (i.value / maxVal) * 100;
      html += `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 3px;">
            <span>${i.label}</span>
            <span style="font-weight: 600; color: #38bdf8;">${i.formatted || i.value}</span>
          </div>
          <div style="background: rgba(255,255,255,0.06); height: 18px; border-radius: 4px; overflow: hidden;">
            <div style="width: ${pct}%; background: linear-gradient(90deg, #0284c7, #38bdf8); height: 100%; border-radius: 4px;"></div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  }

  renderFallbackSVGLine(container, data) {
    container.innerHTML = `
      <div style="padding: 10px; font-size: 0.85rem; color: #94a3b8;">
        Line Chart: ${data.series.length} readings. Non-producing dates: <strong>${data.not_producing_dates.join(", ")}</strong>.
      </div>
    `;
  }
}

window.uiVisualizer = new UIVisualizer();
