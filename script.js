// Currency Converter
// Free exchange-rate APIs (no key needed). Agar pehli na chale to agli try hoti hai.

const SOURCES = [
  {
    url: "https://open.er-api.com/v6/latest/USD",
    read: function (d) {
      if (d.result !== "success") throw new Error("API result: " + d.result);
      return { rates: d.rates, updated: d.time_last_update_utc };
    },
  },
  {
    url: "https://api.exchangerate-api.com/v4/latest/USD",
    read: function (d) {
      return { rates: d.rates, updated: d.date };
    },
  },
  {
    url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    read: function (d) {
      return { rates: d.usd, updated: d.date };
    },
  },
];

const POPULAR = ["PKR", "USD", "EUR", "GBP", "SAR", "AED", "CAD", "AUD", "CNY", "INR", "JPY", "TRY"];

// Video ke liye: page link ke end mein ?error=1 laga do to error state dikhegi
const forceError = new URLSearchParams(window.location.search).has("error");
const TIMEOUT_MS = 12000;

const app = document.getElementById("app");
const message = document.getElementById("message");
const amountInput = document.getElementById("amount");
const fromSelect = document.getElementById("from");
const toSelect = document.getElementById("to");
const swapBtn = document.getElementById("swap");
const resultEl = document.getElementById("result");
const updatedEl = document.getElementById("updated");
const searchInput = document.getElementById("search");
const filterSelect = document.getElementById("filter");
const countEl = document.getElementById("count");
const listEl = document.getElementById("list");

// currency ke naam browser khud deta hai (USD -> US Dollar)
const nameFormatter = new Intl.DisplayNames(["en"], { type: "currency" });

let rates = {}; // 1 USD = kitne units
let state = "loading"; // "loading" | "ready" | "error"

function currencyName(code) {
  try {
    const n = nameFormatter.of(code);
    return n && n !== code ? n : "";
  } catch (e) {
    return "";
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatNumber(n) {
  const digits = Math.abs(n) >= 1 ? 2 : 6;
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

/* ---------- loading / error screens ---------- */

function showLoading() {
  state = "loading";
  app.hidden = true;
  message.className = "message";
  message.innerHTML = `
    <div class="spinner"></div>
    <h2>Loading exchange rates...</h2>
    <p>Please wait a moment.</p>
  `;
}

function showError(detail) {
  state = "error";
  app.hidden = true;
  message.className = "message error";
  message.innerHTML = `
    <h2>Couldn't load exchange rates</h2>
    <p>Check your internet connection and try again.</p>
    <p class="detail">${escapeHtml(detail || "")}</p>
    <button id="retry" type="button">Try again</button>
  `;
  document.getElementById("retry").addEventListener("click", loadRates);
}

function showApp() {
  state = "ready";
  message.className = "message";
  message.innerHTML = "";
  app.hidden = false;
}

/* ---------- data ---------- */

// sirf asli currencies rakho (crypto aur ajeeb codes hata do)
function cleanRates(raw) {
  const out = {};
  Object.keys(raw).forEach(function (key) {
    const code = key.toUpperCase();
    const value = raw[key];
    if (/^[A-Z]{3}$/.test(code) && typeof value === "number" && value > 0 && currencyName(code)) {
      out[code] = value;
    }
  });
  out.USD = 1;
  return out;
}

async function fetchFrom(source) {
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(source.url, { signal: controller.signal });
    if (!response.ok) throw new Error("Status " + response.status);

    const data = await response.json();
    const info = source.read(data);
    const cleaned = cleanRates(info.rates || {});

    if (Object.keys(cleaned).length < 20 || !cleaned.PKR) {
      throw new Error("Incomplete data");
    }
    return { rates: cleaned, updated: info.updated };
  } finally {
    clearTimeout(timer);
  }
}

async function loadRates() {
  showLoading();

  if (forceError) {
    console.error("Forced error for demo (?error=1)");
    showError("Demo error (?error=1)");
    return;
  }

  let lastError = "";

  for (const source of SOURCES) {
    try {
      const info = await fetchFrom(source);
      rates = info.rates;
      setupSelects();
      showUpdated(info.updated);
      showApp();
      render();
      return;
    } catch (error) {
      console.error("Failed:", source.url, error);
      lastError = error.name === "AbortError" ? "Request timed out" : error.message;
    }
  }

  showError("Details: " + lastError);
}

/* ---------- UI ---------- */

function setupSelects() {
  const codes = Object.keys(rates).sort();
  const options = codes
    .map(function (code) {
      return `<option value="${code}">${code} - ${escapeHtml(currencyName(code))}</option>`;
    })
    .join("");

  fromSelect.innerHTML = options;
  toSelect.innerHTML = options;
  fromSelect.value = "USD";
  toSelect.value = "PKR";
}

function showUpdated(updated) {
  const date = new Date(updated);
  const text = isNaN(date) ? updated : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  updatedEl.textContent = text ? "Rates last updated: " + text : "";
}

function convert(amount, from, to) {
  return (amount / rates[from]) * rates[to];
}

function render() {
  if (state !== "ready") return;

  const from = fromSelect.value;
  const to = toSelect.value;
  const parsed = parseFloat(amountInput.value);
  const amount = isNaN(parsed) || parsed < 0 ? 0 : parsed;

  // main result
  const converted = convert(amount, from, to);
  const oneRate = convert(1, from, to);
  resultEl.innerHTML = `
    <p class="small">${formatNumber(amount)} ${from} =</p>
    <p class="big">${formatNumber(converted)} ${to}</p>
    <p class="rate">1 ${from} = ${formatNumber(oneRate)} ${to}</p>
  `;

  // list of all currencies
  const text = searchInput.value.trim().toLowerCase();
  const popularOnly = filterSelect.value === "popular";

  const codes = Object.keys(rates)
    .filter(function (code) {
      if (code === from) return false;
      if (popularOnly && !POPULAR.includes(code)) return false;
      const name = currencyName(code).toLowerCase();
      return code.toLowerCase().includes(text) || name.includes(text);
    })
    .sort();

  const total = Object.keys(rates).length - 1;
  countEl.textContent = "Showing " + codes.length + " of " + total + " currencies (values for " + formatNumber(amount) + " " + from + ")";

  if (codes.length === 0) {
    listEl.innerHTML = `<li class="empty">No currencies found. Try a different name or code.</li>`;
    return;
  }

  listEl.innerHTML = codes
    .map(function (code) {
      const selected = code === to ? " selected" : "";
      return `
        <li class="row${selected}" data-code="${code}" role="button" tabindex="0">
          <span class="code">${code}</span>
          <span class="name">${escapeHtml(currencyName(code))}</span>
          <span class="value">${formatNumber(convert(amount, from, code))}</span>
        </li>
      `;
    })
    .join("");
}

function pickCurrency(row) {
  if (!row) return;
  toSelect.value = row.dataset.code;
  render();
}

/* ---------- events ---------- */

amountInput.addEventListener("input", render);
fromSelect.addEventListener("change", render);
toSelect.addEventListener("change", render);
searchInput.addEventListener("input", render);
filterSelect.addEventListener("change", render);

swapBtn.addEventListener("click", function () {
  const temp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = temp;
  render();
});

listEl.addEventListener("click", function (e) {
  pickCurrency(e.target.closest(".row"));
});

listEl.addEventListener("keydown", function (e) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    pickCurrency(e.target.closest(".row"));
  }
});

loadRates();
