const balanceEl = document.getElementById("balance");
const incomeAmountEl = document.getElementById("income-amount");
const expenseAmountEl = document.getElementById("expense-amount");
const transactionListEl = document.getElementById("transaction-list");
const transactionFormEl = document.getElementById("transaction-form");
const descriptionEl = document.getElementById("description");
const amountEl = document.getElementById("amount");
const currencySelect = document.getElementById("currency");

const API_KEY = "4587cf33984793a5584b9298";
const BASE_CURRENCY = "USD";
let EXCHANGE_RATES = { USD: 1 };

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let currentCurrency = localStorage.getItem("currency") || "USD";
let expenseChart = null;

currencySelect.value = currentCurrency;
transactionFormEl.addEventListener("submit", addTransaction);
currencySelect.addEventListener("change", handleCurrencyChange);

async function fetchExchangeRates() {
  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${BASE_CURRENCY}`
    );
    const data = await res.json();

    if (data.result !== "success") throw new Error("FX API failed");

    EXCHANGE_RATES = data.conversion_rates;
    saveAndRender();
  } catch (err) {
    console.error("Using fallback FX rates:", err.message);
  }
}

function formatCurrencyFromUSD(usdValue) {
  if (!EXCHANGE_RATES[currentCurrency]) return "--";

  const converted = usdValue * EXCHANGE_RATES[currentCurrency];

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currentCurrency,
    minimumFractionDigits: currentCurrency === "JPY" ? 0 : 2
  }).format(converted);
}

function addTransaction(e) {
  e.preventDefault();

  const description = descriptionEl.value.trim();
  const inputAmount = Number(amountEl.value);

  if (!description || isNaN(inputAmount)) return;

  const amountUSD = inputAmount / EXCHANGE_RATES[currentCurrency];

  transactions.push({
    id: Date.now(),
    description,
    amountUSD
  });

  saveAndRender();
  transactionFormEl.reset();
}

function removeTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveAndRender();
}

function updateTransactionList() {
  transactionListEl.innerHTML = "";

  [...transactions].reverse().forEach(t => {
    const li = document.createElement("li");
    li.classList.add("transaction", t.amountUSD > 0 ? "income" : "expense");

    li.innerHTML = `
      <span>${t.description}</span>
      <span>
        ${formatCurrencyFromUSD(t.amountUSD)}
        <button class="delete-btn" onclick="removeTransaction(${t.id})">×</button>
      </span>
    `;
    transactionListEl.appendChild(li);
  });
}

function updateSummary() {
  const balanceUSD = transactions.reduce((a, t) => a + t.amountUSD, 0);
  const incomeUSD = transactions.filter(t => t.amountUSD > 0).reduce((a, t) => a + t.amountUSD, 0);
  const expenseUSD = transactions.filter(t => t.amountUSD < 0).reduce((a, t) => a + t.amountUSD, 0);

  balanceEl.textContent = formatCurrencyFromUSD(balanceUSD);
  incomeAmountEl.textContent = formatCurrencyFromUSD(incomeUSD);
  expenseAmountEl.textContent = formatCurrencyFromUSD(expenseUSD);
}


const valueLabelPlugin = {
  id: "valueLabelPlugin",
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    ctx.save();

    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);

      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (!value) return;

        const formatted = new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currentCurrency,
          minimumFractionDigits: currentCurrency === "JPY" ? 0 : 2
        }).format(value);

        ctx.font = "600 12px Poppins, sans-serif";
        ctx.textAlign = "center";

        const textHeight = 14;
        const padding = 6;

       
        let y = bar.y - padding;
        let color = "#111";

       
        if (y - textHeight < chartArea.top) {
          y = bar.y + textHeight + padding;
          color = "#fff"; 
        }

        ctx.fillStyle = color;
        ctx.fillText(formatted, bar.x, y);
      });
    });

    ctx.restore();
  }
};

function updateChart() {
  const canvas = document.getElementById("expenseChart");
  if (!canvas) return;

  const income = transactions
    .filter(t => t.amountUSD > 0)
    .reduce((a, t) => a + t.amountUSD, 0) * EXCHANGE_RATES[currentCurrency];

  const expense = Math.abs(
    transactions
      .filter(t => t.amountUSD < 0)
      .reduce((a, t) => a + t.amountUSD, 0)
  ) * EXCHANGE_RATES[currentCurrency];

  if (expenseChart) expenseChart.destroy();

  expenseChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: ["Income", "Expenses"],
      datasets: [{
        data: [income, expense],
        backgroundColor: ["#059669", "#dc2626"],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    },
    plugins: [valueLabelPlugin]
  });
}

function handleCurrencyChange() {
  currentCurrency = currencySelect.value;
  localStorage.setItem("currency", currentCurrency);
  saveAndRender();
}

function saveAndRender() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
  updateTransactionList();
  updateSummary();
  updateChart();
}

fetchExchangeRates();
