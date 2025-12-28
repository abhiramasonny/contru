const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userChip = document.getElementById("userChip");
const analyzeBtn = document.getElementById("analyzeBtn");
const docInput = document.getElementById("docInput");
const result = document.getElementById("result");
const fileName = document.getElementById("fileName");
const fileMeta = document.getElementById("fileMeta");
const contribCount = document.getElementById("contribCount");
const activityCount = document.getElementById("activityCount");
const longestStreak = document.getElementById("longestStreak");
const currentStreak = document.getElementById("currentStreak");
const contribList = document.getElementById("contribList");
const heatmap = document.getElementById("heatmap");
const yearLabel = document.getElementById("yearLabel");
const yearSelect = document.getElementById("yearSelect");
const exportBtn = document.getElementById("exportBtn");
const accessList = document.getElementById("accessList");
const consentBtn = document.getElementById("consentBtn");

let chart;
let lastData;

const nowYear = new Date().getFullYear();
for (let y = nowYear; y >= nowYear - 5; y -= 1) {
  const option = document.createElement("option");
  option.value = String(y);
  option.textContent = String(y);
  yearSelect.appendChild(option);
}

loginBtn.addEventListener("click", () => {
  window.location.href = "/auth/google";
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/auth/logout", { method: "POST" });
  userChip.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  loginBtn.classList.remove("hidden");
});

analyzeBtn.addEventListener("click", async () => {
  const url = docInput.value.trim();
  if (!url) return;

  analyzeBtn.textContent = "Analyzing...";
  analyzeBtn.disabled = true;

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, year: Number(yearSelect.value) })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");

    renderResults(data);
  } catch (err) {
    alert(err.message);
  } finally {
    analyzeBtn.textContent = "Analyze";
    analyzeBtn.disabled = false;
  }
});

yearSelect.addEventListener("change", () => {
  if (!docInput.value.trim()) return;
  analyzeBtn.click();
});

exportBtn.addEventListener("click", () => {
  if (!lastData) return;
  const rows = [["Name", "Email", "Activities"]];
  lastData.contributors.forEach((c) => {
    rows.push([c.name, c.email || "", String(c.count)]);
  });
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${lastData.file?.name || "contributors"}-${lastData.year}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

consentBtn.addEventListener("click", async () => {
  consentBtn.textContent = "Registering...";
  consentBtn.disabled = true;
  try {
    const res = await fetch("/api/consent", { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to register");
    alert("Registered. Re-run Analyze to update names.");
  } catch (err) {
    alert(err.message);
  } finally {
    consentBtn.textContent = "Register My Identity";
    consentBtn.disabled = false;
  }
});

async function checkAuth() {
  try {
    const res = await fetch("/api/me");
    if (!res.ok) return;
    const { user } = await res.json();
    if (!user) return;

    userChip.textContent = `${user.name || user.email}`;
    userChip.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loginBtn.classList.add("hidden");
  } catch (err) {
    console.error(err);
  }
}

function renderResults(data) {
  lastData = data;
  result.classList.remove("hidden");
  fileName.textContent = data.file?.name || "Untitled";
  fileMeta.textContent = `${data.file?.mimeType || ""} · Updated ${new Date(
    data.file?.modifiedTime
  ).toLocaleDateString()}`;
  contribCount.textContent = data.contributors.length;
  activityCount.textContent = data.activityCount || 0;
  longestStreak.textContent = data.streaks?.longestStreak || 0;
  currentStreak.textContent = data.streaks?.currentStreak || 0;
  yearLabel.textContent = `Year ${data.year}`;

  renderChart(data.contributors);
  renderList(data.contributors);
  renderHeatmap(data.heatmap);
  renderAccessList(data.permissions || []);
}

function renderChart(contributors) {
  const ctx = document.getElementById("barChart");
  const labels = contributors.map((c) =>
    c.name && c.name.startsWith("people/") && !c.email ? "Unresolved user" : c.name
  );
  const values = contributors.map((c) => c.count);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Activity",
          data: values,
          backgroundColor: "rgba(255, 138, 31, 0.7)",
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function renderList(contributors) {
  contribList.innerHTML = "";
  contributors.forEach((c) => {
    const card = document.createElement("div");
    card.className = "contrib-card";
    const displayName =
      c.name && c.name.startsWith("people/") && !c.email ? "Unresolved user" : c.name;
    const secondary = c.email ? `${c.email} · ${c.count} activities` : `${c.count} activities`;
    card.innerHTML = `<strong>${displayName}</strong><span>${secondary}</span>`;
    contribList.appendChild(card);
  });
}

function renderAccessList(permissions) {
  accessList.innerHTML = "";
  if (!permissions.length) {
    accessList.innerHTML = "<p class=\"meta\">No permissions data available.</p>";
    return;
  }

  permissions.forEach((p) => {
    const card = document.createElement("div");
    card.className = "contrib-card";
    const name = p.displayName || (p.emailAddress ? p.emailAddress.split("@")[0] : "Unknown");
    const secondary = p.emailAddress
      ? `${p.emailAddress} · ${p.role}`
      : `${p.type} · ${p.role}`;
    card.innerHTML = `<strong>${name}</strong><span>${secondary}</span>`;
    accessList.appendChild(card);
  });
}

function renderHeatmap(heatmapData) {
  heatmap.innerHTML = "";
  const days = Object.keys(heatmapData);
  const values = Object.values(heatmapData);
  const max = Math.max(1, ...values);

  days.forEach((day) => {
    const value = heatmapData[day];
    const level = value === 0 ? 0 : Math.ceil((value / max) * 5);

    const cell = document.createElement("div");
    cell.className = "heat-cell";
    cell.dataset.level = String(level);
    cell.title = `${day}: ${value} activities`;
    heatmap.appendChild(cell);
  });
}

function escapeCsv(value) {
  const safe = String(value ?? "");
  if (safe.includes(",") || safe.includes("\"") || safe.includes("\n")) {
    return `"${safe.replace(/"/g, "\"\"")}"`;
  }
  return safe;
}

checkAuth();
