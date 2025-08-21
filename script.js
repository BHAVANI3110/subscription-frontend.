/**********************
 * Simple Frontend Auth
 **********************/
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const logoutLink = document.getElementById("logoutLink");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = document.getElementById("username").value.trim();
      const p = document.getElementById("password").value.trim();
      if (u === "vsb" && p === "1111") {
        // (Optional) remember logged in state
        localStorage.setItem("loggedIn", "1");
        window.location.href = "dashboard.html";
      } else {
        alert("Invalid credentials (try vsb / 1111)");
      }
    });
  }

  if (logoutLink) {
    logoutLink.addEventListener("click", () => {
      localStorage.removeItem("loggedIn");
    });
  }

  // If you want to force login before dashboard:
  // if (location.pathname.endsWith("dashboard.html") && localStorage.getItem("loggedIn") !== "1") {
  //   location.href = "login.html";
  // }

  initDashboard();
  initSettings();
});

/*****************************
 * Local Storage & Data Model
 *****************************/
const SUBS_KEY = "subs:data";
const SETTINGS_KEY = "subs:settings";

function getSettings() {
  const def = { remindersEnabled: true, reminderDays: 7 };
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? def;
  } catch { return def; }
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

function getSubs() {
  try {
    const saved = JSON.parse(localStorage.getItem(SUBS_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {}
  // default seed data
  const seed = [
    { service: "Netflix", amount: 499, date: "2025-09-10", status: "Active" },
    { service: "Spotify", amount: 199, date: "2025-09-05", status: "Active" },
    { service: "Disney+", amount: 299, date: "2025-09-01", status: "Expired" }
  ];
  localStorage.setItem(SUBS_KEY, JSON.stringify(seed));
  return seed;
}
function saveSubs(arr) { localStorage.setItem(SUBS_KEY, JSON.stringify(arr)); }

/*****************
 * Dashboard page
 *****************/
function initDashboard() {
  const table = document.getElementById("subscriptionTable");
  if (!table) return; // not on dashboard

  const tbody = table.querySelector("tbody");
  const form = document.getElementById("subscriptionForm");
  const formTitle = document.getElementById("formTitle");
  const submitBtn = document.getElementById("submitBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const searchInput = document.getElementById("searchInput");
  const filterSelect = document.getElementById("filterSelect");
  const upcomingBanner = document.getElementById("upcomingBanner");
  const summaryCards = document.getElementById("summaryCards");

  let subs = getSubs();
  let editingIndex = -1;

  function renderCards() {
    // show 3 cards (Netflix/Spotify/Disney) if they exist; fallback to totals
    const total = subs.length;
    const active = subs.filter(s => s.status === "Active").length;
    const expired = subs.filter(s => s.status === "Expired").length;

    const nearest = [...subs].sort((a,b) => new Date(a.date) - new Date(b.date))[0];

    summaryCards.innerHTML = `
      <div class="sub-card netflix">
        <h2>Total</h2>
        <p><span class="badge">${total}</span> subscriptions</p>
        ${nearest ? `<p>Next: ${nearest.service} on ${nearest.date}</p>` : `<p>No upcoming</p>`}
      </div>
      <div class="sub-card spotify">
        <h2>Active</h2>
        <p><span class="badge">${active}</span> running</p>
      </div>
      <div class="sub-card disney">
        <h2>Expired</h2>
        <p><span class="badge">${expired}</span> ended</p>
      </div>
    `;
  }

  function rowHTML(s, i) {
    const statusClass = s.status === "Active" ? "badge" : "badge";
    return `
      <tr>
        <td>${s.service}</td>
        <td>₹${Number(s.amount).toLocaleString("en-IN")}</td>
        <td>${s.date}</td>
        <td><span class="${statusClass}">${s.status}</span></td>
        <td class="actions">
          <button class="action-btn action-edit" data-idx="${i}">Edit</button>
          <button class="action-btn action-del"  data-idx="${i}">Delete</button>
        </td>
      </tr>
    `;
  }

  function applyFilters(list) {
    const q = (searchInput.value || "").toLowerCase().trim();
    const f = filterSelect.value;
    return list.filter(item => {
      const matchText = !q || item.service.toLowerCase().includes(q);
      const matchFilter = (f === "All") || item.status === f;
      return matchText && matchFilter;
    });
  }

  function renderTable() {
    const filtered = applyFilters(subs);
    tbody.innerHTML = filtered.map((s, i) => rowHTML(s, i)).join("");
  }

  function renderUpcomingBanner() {
    const { remindersEnabled, reminderDays } = getSettings();
    if (!remindersEnabled) { upcomingBanner.classList.add("hidden"); return; }

    const today = new Date();
    const within = [];
    subs.forEach(s => {
      const due = new Date(s.date);
      const diffDays = Math.ceil((due - today) / (1000*60*60*24));
      if (diffDays >= 0 && diffDays <= Number(reminderDays)) {
        within.push({ ...s, in: diffDays });
      }
    });

    if (within.length) {
      const lines = within
        .sort((a,b)=>a.in-b.in)
        .map(w => `${w.service} due in ${w.in} day(s) on ${w.date}`)
        .join(" • ");
      upcomingBanner.textContent = `⏰ Upcoming payments: ${lines}`;
      upcomingBanner.classList.remove("hidden");
    } else {
      upcomingBanner.classList.add("hidden");
    }
  }

  function rerender() {
    renderCards();
    renderTable();
    renderUpcomingBanner();
  }

  // Initial paint
  rerender();

  // Add / Edit submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const service = document.getElementById("service").value.trim();
    const amount  = document.getElementById("amount").value.trim();
    const date    = document.getElementById("date").value;
    const status  = document.getElementById("status").value;

    if (!service || !amount || !date) return;

    const next = { service, amount: Number(amount), date, status };

    if (editingIndex >= 0) {
      subs[editingIndex] = next;
      editingIndex = -1;
      formTitle.textContent = "Add New Subscription";
      submitBtn.textContent = "Add";
      cancelEditBtn.classList.add("hidden");
    } else {
      subs.push(next);
    }
    saveSubs(subs);
    form.reset();
    rerender();
  });

  // Cancel edit
  cancelEditBtn.addEventListener("click", () => {
    editingIndex = -1;
    form.reset();
    formTitle.textContent = "Add New Subscription";
    submitBtn.textContent = "Add";
    cancelEditBtn.classList.add("hidden");
  });

  // Row actions (edit/delete)
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const item = applyFilters(subs)[idx]; // idx in filtered list
    // Need actual index in subs:
    const realIndex = subs.findIndex(s =>
      s.service === item.service &&
      String(s.amount) === String(item.amount) &&
      s.date === item.date &&
      s.status === item.status
    );

    if (btn.classList.contains("action-edit")) {
      if (realIndex < 0) return;
      editingIndex = realIndex;
      document.getElementById("service").value = subs[realIndex].service;
      document.getElementById("amount").value  = subs[realIndex].amount;
      document.getElementById("date").value    = subs[realIndex].date;
      document.getElementById("status").value  = subs[realIndex].status;
      formTitle.textContent = "Edit Subscription";
      submitBtn.textContent = "Save";
      cancelEditBtn.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (btn.classList.contains("action-del")) {
      if (realIndex < 0) return;
      if (confirm("Delete this subscription?")) {
        subs.splice(realIndex, 1);
        saveSubs(subs);
        rerender();
      }
    }
  });

  // Search & Filter events
  searchInput.addEventListener("input", renderTable);
  filterSelect.addEventListener("change", renderTable);
}

/****************
 * Settings page
 ****************/
function initSettings() {
  const form = document.getElementById("settingsForm");
  if (!form) return;

  const remindersEnabled = document.getElementById("remindersEnabled");
  const reminderDays = document.getElementById("reminderDays");

  // load
  const s = getSettings();
  remindersEnabled.checked = !!s.remindersEnabled;
  reminderDays.value = Number(s.reminderDays) || 7;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettings({
      remindersEnabled: remindersEnabled.checked,
      reminderDays: Math.max(1, Math.min(30, Number(reminderDays.value) || 7))
    });
    alert("Settings saved!");
  });
}

