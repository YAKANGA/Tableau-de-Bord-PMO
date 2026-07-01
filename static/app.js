const state = {
  data: null,
  search: "",
  status: "all",
  pole: "all",
  entity: "all",
  country: "all",
  project: "all",
  period: "all",
  analysisDimension: "byPole",
  annualPoles: [],
  annualEntities: [],
};

const money = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function formatMoney(value) {
  const abs = Math.abs(value || 0);
  if (abs >= 1_000_000_000) return `${decimal.format((value || 0) / 1_000_000_000)} Md FCFA`;
  if (abs >= 1_000_000) return `${decimal.format((value || 0) / 1_000_000)} M FCFA`;
  return `${money.format(value || 0)} FCFA`;
}

function formatPercent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function formatRatio(value) {
  return value ? decimal.format(value) : "-";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setOptions(select, values, label) {
  if (!select) return;
  const current = select.value || "all";
  select.innerHTML = `<option value="all">${label}</option>${values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("")}`;
  select.value = values.includes(current) ? current : "all";
}

function setProjectOptions(select, projects) {
  if (!select) return;
  const current = select.value || "all";
  const options = projects
    .filter((project) => project.code)
    .map((project) => ({
      value: project.code,
      label: `${project.code} - ${project.name}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  select.innerHTML = `<option value="all">Tous projets</option>${options
    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("")}`;
  select.value = options.some((option) => option.value === current) ? current : "all";
}

function selectedOptions(select) {
  return Array.from(select?.selectedOptions || []).map((option) => option.value);
}

function setRequiredMultiOptions(select, values, selectedValues) {
  if (!select) return [];
  const uniqueValues = unique(values);
  const validSelected = selectedValues.filter((value) => uniqueValues.includes(value));
  const effectiveSelected = validSelected.length ? validSelected : uniqueValues;
  select.innerHTML = uniqueValues
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
  Array.from(select.options).forEach((option) => {
    option.selected = effectiveSelected.includes(option.value);
  });
  return effectiveSelected;
}

function enforceRequiredMultiSelect(select, stateKey) {
  const values = selectedOptions(select);
  if (values.length) {
    state[stateKey] = values;
    return;
  }
  const fallback = state[stateKey].length ? state[stateKey] : Array.from(select.options).map((option) => option.value);
  Array.from(select.options).forEach((option) => {
    option.selected = fallback.includes(option.value);
  });
  state[stateKey] = fallback;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderBars(elementId, counts, color = "#0f766e") {
  const element = document.getElementById(elementId);
  if (!element) return;
  const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map((entry) => entry[1]), 1);
  element.innerHTML = entries
    .map(([label, value]) => {
      const width = Math.max(4, (value / max) * 100);
      return `
        <div class="barRow">
          <span class="barLabel" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
          <span class="barTrack"><span class="barFill" style="width:${width}%;background:${color}"></span></span>
          <span class="barValue">${value}</span>
        </div>
      `;
    })
    .join("");
}

function renderMonthly() {
  const rows = state.data.analytics.monthly || [];
  const chart = document.getElementById("monthlyChart");
  if (!chart) return;
  if (!rows.length) {
    chart.innerHTML = "<p>Aucune période mensuelle disponible.</p>";
    return;
  }

  const width = 760;
  const height = 250;
  const padding = { left: 50, right: 18, top: 28, bottom: 36 };
  const values = rows.map((row) => row.earnedValue || row.averageProgress || 0);
  const max = Math.max(...values, 1);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const x = (index) => padding.left + (rows.length === 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth);
  const y = (value) => padding.top + plotHeight - (value / max) * plotHeight;
  const points = rows.map((row, index) => `${x(index)},${y(values[index])}`).join(" ");
  const area = `${padding.left},${padding.top + plotHeight} ${points} ${padding.left + plotWidth},${padding.top + plotHeight}`;
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const gy = padding.top + plotHeight - ratio * plotHeight;
      return `<line x1="${padding.left}" y1="${gy}" x2="${padding.left + plotWidth}" y2="${gy}" stroke="#dbe5ee" stroke-dasharray="3 4" />`;
    })
    .join("");
  const labels = rows
    .map((row, index) => `<text class="axisLabel" x="${x(index)}" y="${height - 10}" text-anchor="middle">${escapeHtml(row.period)}</text>`)
    .join("");
  const markers = rows
    .map(
      (row, index) => `
        <circle cx="${x(index)}" cy="${y(values[index])}" r="4" fill="#10b981" />
        <text class="axisLabel" x="${x(index)}" y="${y(values[index]) - 10}" text-anchor="middle">${formatPercent(row.averageProgress)}</text>
      `,
    )
    .join("");

  chart.innerHTML = `
    <svg class="trendSvg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tendance mensuelle PMO">
      ${grid}
      <polygon points="${area}" fill="rgba(16,185,129,0.08)" />
      <polyline points="${points}" fill="none" stroke="#10b981" stroke-width="3" />
      ${markers}
      ${labels}
    </svg>
  `;
}

function renderDistribution() {
  const counts = state.data.summary.pmoStatusCounts || state.data.summary.statusCounts || {};
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);
  const colors = ["#0f7f78", "#2563eb", "#c2410c", "#7c3cff", "#f59e0b"];
  let current = 0;
  const segments = entries
    .map(([, value], index) => {
      const start = current;
      const pct = total ? (value / total) * 100 : 0;
      current += pct;
      return `${colors[index % colors.length]} ${start}% ${current}%`;
    })
    .join(", ");

  const legend = entries
    .map(([label, value], index) => {
      const pct = total ? Math.round((value / total) * 100) : 0;
      return `
        <div class="legendItem">
          <div class="legendName">
            <span class="legendDot" style="background:${colors[index % colors.length]}"></span>
            <span title="${escapeHtml(label)}">${escapeHtml(label)}</span>
          </div>
          <span class="legendPct">${pct}%</span>
          <span class="legendCount" style="color:${colors[index % colors.length]}">${value}</span>
        </div>
      `;
    })
    .join("");

  const chart = document.getElementById("statusChart");
  if (!chart) return;
  chart.innerHTML = `
    <div class="donut" style="background: conic-gradient(${segments || "#dbe5ee 0% 100%"});">
      <div class="donutCenter">
        <strong>${total}</strong>
        <small>Total</small>
      </div>
    </div>
    <div class="legendList">${legend}</div>
  `;
}

function aggregateForComparison(projects, keyName, labelName) {
  const groups = new Map();
  projects.forEach((project) => {
    const key = keyName === "project" ? project.code : project[keyName];
    const label = labelName ? labelName(project) : key;
    const name = key || "Non renseigné";
    if (!groups.has(name)) {
      groups.set(name, {
        name: label || name,
        projectCount: 0,
        amountTtc: 0,
        budget: 0,
        earnedValue: 0,
        expenses: 0,
        progressTotal: 0,
        delayedCount: 0,
        redCount: 0,
        orangeCount: 0,
        greenCount: 0,
      });
    }
    const row = groups.get(name);
    row.projectCount += 1;
    row.amountTtc += Number(project.amountTtc || 0);
    row.budget += Number(project.budget || 0);
    row.earnedValue += Number(project.earnedValue || 0);
    row.expenses += Number(project.expenses || 0);
    row.progressTotal += Number(project.progress || 0);
    if (String(project.status).toLowerCase().includes("retard")) row.delayedCount += 1;
    if (project.pmoStatus === "Rouge") row.redCount += 1;
    if (project.pmoStatus === "Orange") row.orangeCount += 1;
    if (project.pmoStatus === "Vert") row.greenCount += 1;
  });

  return [...groups.values()]
    .map((row) => ({
      ...row,
      averageProgress: row.projectCount ? row.progressTotal / row.projectCount : 0,
      cpi: row.expenses ? row.earnedValue / row.expenses : 0,
    }))
    .sort((a, b) => b.cpi - a.cpi);
}

function renderComparisonChart(elementId, rows) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const topRows = rows.slice(0, 7);
  const max = Math.max(...topRows.map((row) => row.cpi), 1);
  if (!topRows.length) {
    element.innerHTML = "<p>Aucune donnée à comparer.</p>";
    return;
  }
  element.innerHTML = topRows
    .map((row) => {
      const width = Math.max(4, (row.cpi / max) * 100);
      const cpiClass = row.cpi < 0.8 ? "cpiBad" : row.cpi <= 0.94 ? "cpiWatch" : "cpiGood";
      return `
        <div class="comparisonBar ${cpiClass}">
          <div class="comparisonBarHeader">
            <span title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</span>
            <strong>CPI ${formatRatio(row.cpi)}</strong>
          </div>
          <div class="barTrack">
            <span class="barFill" style="width:${width}%"></span>
          </div>
          <div class="comparisonMeta">
            <span>${row.projectCount} projet(s)</span>
            <span>${formatMoney(row.earnedValue)}</span>
            <span>${formatPercent(row.averageProgress)}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderComparisons() {
  const projects = filteredProjects();
  const poleRows = aggregateForComparison(projects, "pole");
  const entityRows = aggregateForComparison(projects, "entity");
  const projectRows = aggregateForComparison(projects, "project", (project) => `${project.code} - ${project.name}`);

  renderComparisonChart("poleComparisonChart", poleRows);
  renderComparisonChart("entityComparisonChart", entityRows);
  renderComparisonChart("projectComparisonChart", projectRows);

  const table = document.getElementById("comparisonRows");
  if (!table) return;
  const rows = [
    ...poleRows.map((row) => ({ level: "Pôle", ...row })),
    ...entityRows.map((row) => ({ level: "Filiale", ...row })),
    ...projectRows.slice(0, 12).map((row) => ({ level: "Projet", ...row })),
  ];
  table.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.level)}</td>
          <td><strong>${escapeHtml(row.name)}</strong></td>
          <td>${row.projectCount}</td>
          <td>${formatMoney(row.amountTtc)}</td>
          <td>${formatMoney(row.budget)}</td>
          <td>${formatMoney(row.earnedValue)}</td>
          <td>${formatMoney(row.expenses)}</td>
          <td>${formatRatio(row.cpi)}</td>
          <td>${formatPercent(row.averageProgress)}</td>
          <td>${row.delayedCount}</td>
          <td>${row.redCount}</td>
          <td>${row.orangeCount}</td>
          <td>${row.greenCount}</td>
        </tr>
      `,
    )
    .join("");
}

function selectedAnalysisYear(projects) {
  if (state.period !== "all" && state.period) return String(state.period).slice(0, 4);
  const years = projects
    .map((project) => String(project.period || "").slice(0, 4))
    .filter(Boolean)
    .sort();
  return years[years.length - 1] || new Date().getFullYear().toString();
}

function aggregateMonthlyVaExpenses(projects, year, dimensionKey) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    monthIndex: index,
    label: new Date(Number(year), index, 1).toLocaleDateString("fr-FR", { month: "short" }),
    earnedValue: 0,
    expenses: 0,
    projectCount: 0,
    groups: new Set(),
  }));

  projects
    .filter((project) => String(project.period || "").slice(0, 4) === year)
    .forEach((project) => {
      const month = Math.max(0, Math.min(11, Number(String(project.period || "").slice(5, 7)) - 1 || 0));
      months[month].earnedValue += Number(project.earnedValue || 0);
      months[month].expenses += Number(project.expenses || 0);
      months[month].projectCount += 1;
      months[month].groups.add(dimensionKey(project) || "Non renseigné");
    });

  return months.map((month) => ({
    ...month,
    groupCount: month.groups.size,
  }));
}

function renderAnnualVaExpensesChart(elementId, months) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const hasData = months.some((month) => month.earnedValue || month.expenses);
  if (!hasData) {
    element.innerHTML = "<p>Aucune donnée annuelle disponible.</p>";
    return;
  }

  const width = 680;
  const height = 290;
  const padding = { left: 62, right: 28, top: 24, bottom: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(...months.flatMap((month) => [month.earnedValue, month.expenses]), 1);
  const x = (index) => padding.left + (index / 11) * plotWidth;
  const y = (value) => padding.top + plotHeight - (value / max) * plotHeight;
  const vaPoints = months.map((month, index) => `${x(index)},${y(month.earnedValue)}`).join(" ");
  const expensePoints = months.map((month, index) => `${x(index)},${y(month.expenses)}`).join(" ");
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const gy = padding.top + plotHeight - ratio * plotHeight;
      const value = max * ratio;
      return `
        <line x1="${padding.left}" y1="${gy}" x2="${padding.left + plotWidth}" y2="${gy}" stroke="#dbe5ee" stroke-dasharray="3 4" />
        <text class="axisLabel" x="${padding.left - 10}" y="${gy + 4}" text-anchor="end">${formatMoney(value).replace(" FCFA", "")}</text>
      `;
    })
    .join("");
  const monthLabels = months
    .map((month, index) => `<text class="axisLabel" x="${x(index)}" y="${height - 12}" text-anchor="middle">${escapeHtml(month.label)}</text>`)
    .join("");
  const vaMarkers = months
    .map((month, index) => `<circle cx="${x(index)}" cy="${y(month.earnedValue)}" r="3.5" fill="#10b981"><title>${month.label} VA: ${formatMoney(month.earnedValue)}</title></circle>`)
    .join("");
  const expenseMarkers = months
    .map((month, index) => `<circle cx="${x(index)}" cy="${y(month.expenses)}" r="3.5" fill="#c2410c"><title>${month.label} Dépenses: ${formatMoney(month.expenses)}</title></circle>`)
    .join("");

  element.innerHTML = `
    <div class="lineLegend">
      <span><i class="vaLegend"></i>VA</span>
      <span><i class="expenseLegend"></i>Dépenses</span>
    </div>
    <svg class="annualLineSvg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Courbes annuelles VA et dépenses">
      ${grid}
      <line x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${padding.left + plotWidth}" y2="${padding.top + plotHeight}" stroke="#a8b7c6" />
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotHeight}" stroke="#a8b7c6" />
      <polyline points="${vaPoints}" fill="none" stroke="#10b981" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
      <polyline points="${expensePoints}" fill="none" stroke="#c2410c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
      ${vaMarkers}
      ${expenseMarkers}
      ${monthLabels}
    </svg>
  `;
}

function renderAnnualAnalysis() {
  const projects = filteredProjects();
  const selectedPoles = state.annualPoles.length ? state.annualPoles : unique(projects.map((project) => project.pole));
  const selectedEntities = state.annualEntities.length ? state.annualEntities : unique(projects.map((project) => project.entity));
  const annualProjects = projects.filter(
    (project) => selectedPoles.includes(project.pole) && selectedEntities.includes(project.entity),
  );
  const year = selectedAnalysisYear(projects);
  setText(
    "annualAnalysisLabel",
    `Analyse ${year} · ${selectedPoles.length} pôle(s) · ${selectedEntities.length} filiale(s) sélectionné(s)`,
  );
  const poleMonths = aggregateMonthlyVaExpenses(annualProjects, year, (project) => project.pole);
  const entityCountryMonths = aggregateMonthlyVaExpenses(
    annualProjects,
    year,
    (project) => `${project.entity} · ${project.country}`,
  );
  renderAnnualVaExpensesChart("annualPoleChart", poleMonths);
  renderAnnualVaExpensesChart("annualEntityCountryChart", entityCountryMonths);
}

function filteredProjects() {
  if (!state.data) return [];
  const term = state.search.trim().toLowerCase();
  return state.data.projects.filter((project) => {
    const matchesSearch =
      !term ||
      [
        project.code,
        project.name,
        project.client,
        project.manager,
        project.director,
        project.entity,
        project.pole,
        project.sector,
        project.location,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    return (
      matchesSearch &&
      (state.status === "all" || project.status === state.status) &&
      (state.pole === "all" || project.pole === state.pole) &&
      (state.entity === "all" || project.entity === state.entity) &&
      (state.country === "all" || project.country === state.country) &&
      (state.project === "all" || project.code === state.project) &&
      (state.period === "all" || project.period === state.period)
    );
  });
}

function renderAnalysis() {
  const rows = state.data.analytics[state.analysisDimension] || [];
  const table = document.getElementById("analysisRows");
  if (!table) return;
  table.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.name)}</strong></td>
          <td>${row.projectCount}</td>
          <td>${formatMoney(row.amountTtc)}</td>
          <td>${formatMoney(row.budget)}</td>
          <td>${formatMoney(row.earnedValue)}</td>
          <td>${formatPercent(row.averageProgress)}</td>
          <td>${formatRatio(row.cpi)}</td>
          <td>${row.delayedCount}</td>
          <td>${row.criticalCount}</td>
        </tr>
      `,
    )
    .join("");
}

function renderProjects() {
  const rows = filteredProjects();
  const table = document.getElementById("projectRows");
  if (!table) return;
  table.innerHTML = rows
    .map((project) => {
      const late = String(project.status).toLowerCase().includes("retard");
      const critical = Number(project.spi) < 0.8 || Number(project.cpi) < 0.8;
      const endDate = project.extendedEndDate || project.contractEndDate || "";
      return `
        <tr>
          <td>${escapeHtml(project.code)}</td>
          <td><strong>${escapeHtml(project.name)}</strong><br><span>${escapeHtml(project.client)}</span></td>
          <td>${escapeHtml(project.country)}</td>
          <td>${escapeHtml(project.pole)}</td>
          <td>${escapeHtml(project.entity)}</td>
          <td>${escapeHtml(project.sector)}</td>
          <td>${escapeHtml(project.manager || project.director || project.entityManager)}</td>
          <td>${escapeHtml(project.startDate || "")}<br><span>${escapeHtml(endDate)}</span></td>
          <td>${formatMoney(project.amountTtc)}</td>
          <td>${formatMoney(project.budget)}</td>
          <td><span class="${critical ? "ratioBad" : ""}">${formatRatio(project.spi)}</span></td>
          <td><span class="${critical ? "ratioBad" : ""}">${formatRatio(project.cpi)}</span></td>
          <td>${formatMoney(project.unpaid)}</td>
          <td>${formatPercent(project.billingRate)}</td>
          <td>${formatPercent(project.collectionRate)}</td>
          <td>
            <span class="progressCell">
              <span class="barTrack"><span class="barFill" style="width:${Math.min(100, (project.progress || 0) * 100)}%"></span></span>
              <strong>${formatPercent(project.progress)}</strong>
            </span>
          </td>
          <td><span class="statusPill ${late ? "late" : ""}">${escapeHtml(project.status)}</span></td>
          <td><span class="statusPill pmo${escapeHtml(project.pmoStatus)}">${escapeHtml(project.pmoStatus)}</span></td>
        </tr>
      `;
    })
    .join("");
}

function renderRisks() {
  const risks = filteredProjects().filter((project) => project.risks || project.decisions);
  const list = document.getElementById("riskList");
  if (!list) return;
  list.innerHTML = risks
    .map(
      (project) => `
        <article class="riskItem">
          <strong>${escapeHtml(project.code)} - ${escapeHtml(project.name)}</strong>
          ${project.risks ? `<p>${escapeHtml(project.risks)}</p>` : ""}
          ${project.decisions ? `<p><b>Décision:</b> ${escapeHtml(project.decisions)}</p>` : ""}
        </article>
      `,
    )
    .join("");
}

function renderDashboard() {
  const { summary, projects, excelPath, lastModified, generatedAt } = state.data;
  setText("sourceInfo", `${excelPath} | Dernière mise à jour: ${lastModified}`);
  setText("decisionSummary", `${summary.delayedCount} projet(s) en retard · ${summary.criticalCount} point(s) critique(s) SPI/CPI`);
  setText("kpiProjects", summary.projectCount);
  setText("kpiAmount", formatMoney(summary.totalAmountTtc));
  setText("kpiBudget", formatMoney(summary.totalBudget));
  setText("kpiEarned", formatMoney(summary.totalEarnedValue));
  setText("kpiCpi", formatRatio(summary.portfolioCpi));
  setText("kpiUnpaid", formatMoney(summary.totalUnpaid));
  setText("kpiBillingRate", formatPercent(summary.billingRate));
  setText("kpiCollectionRate", formatPercent(summary.collectionRate));
  setText("kpiDelayed", summary.delayedCount);
  setText("kpiCritical", summary.criticalCount);
  setText("kpiProgress", formatPercent(summary.averageProgress));

  setOptions(document.getElementById("periodFilter"), summary.periods || [], "Toutes périodes");
  setOptions(document.getElementById("poleFilter"), unique(projects.map((p) => p.pole)), "Tous pôles");
  setOptions(document.getElementById("entityFilter"), unique(projects.map((p) => p.entity)), "Toutes filiales");
  setOptions(document.getElementById("countryFilter"), unique(projects.map((p) => p.country)), "Tous pays");
  setProjectOptions(document.getElementById("projectFilter"), projects);
  setOptions(document.getElementById("statusFilter"), unique(projects.map((p) => p.status)), "Tous statuts");
  state.annualPoles = setRequiredMultiOptions(
    document.getElementById("annualPoleFilter"),
    projects.map((project) => project.pole),
    state.annualPoles,
  );
  state.annualEntities = setRequiredMultiOptions(
    document.getElementById("annualEntityFilter"),
    projects.map((project) => project.entity),
    state.annualEntities,
  );
  renderMonthly();
  renderDistribution();
  renderComparisons();
  renderAnnualAnalysis();
  renderAnalysis();
  renderProjects();
  renderRisks();
}

async function loadDashboard() {
  const response = await fetch("/api/dashboard", { cache: "no-store" });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || "Erreur de lecture du fichier Excel");
  state.data = payload;
  renderDashboard();
}

document.getElementById("refreshBtn")?.addEventListener("click", loadDashboard);
document.querySelectorAll(".segmented button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segmented button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.analysisDimension = button.dataset.dimension;
    renderAnalysis();
  });
});
document.getElementById("searchInput")?.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProjects();
  renderComparisons();
  renderAnnualAnalysis();
  renderRisks();
});
["period", "pole", "entity", "country", "project", "status"].forEach((name) => {
  document.getElementById(`${name}Filter`)?.addEventListener("change", (event) => {
    if (!event.target) return;
    state[name] = event.target.value;
    renderProjects();
    renderComparisons();
    renderAnnualAnalysis();
    renderRisks();
  });
});

[
  ["annualPoleFilter", "annualPoles"],
  ["annualEntityFilter", "annualEntities"],
].forEach(([elementId, stateKey]) => {
  document.getElementById(elementId)?.addEventListener("change", (event) => {
    enforceRequiredMultiSelect(event.target, stateKey);
    renderAnnualAnalysis();
  });
});

loadDashboard().catch((error) => {
  document.body.innerHTML = `<main class="workspace"><section class="panel"><h1>Erreur</h1><p>${escapeHtml(error.message)}</p></section></main>`;
});

setInterval(() => {
  loadDashboard().catch(console.error);
}, 20000);
