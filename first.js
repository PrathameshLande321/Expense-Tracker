const balanceEl = document.getElementById("balance");
const incomeAmountEl = document.getElementById("income-amount");
const expenseAmountEl = document.getElementById("expense-amount");
const transactionListEl = document.getElementById("transaction-list");
const transactionFormEl = document.getElementById("transaction-form");
const descriptionEl = document.getElementById("description");
const amountEl = document.getElementById("amount");
const currencySelect = document.getElementById("currency");

const incomeBtn = document.getElementById("income-btn");
const expenseBtn = document.getElementById("expense-btn");

const API_KEY = "4587cf33984793a5584b9298";
const BASE_CURRENCY = "USD";
let EXCHANGE_RATES = { USD: 1 };

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let currentCurrency = localStorage.getItem("currency") || "USD";
let expenseChart = null;


let transactionType = "income";

currencySelect.value = currentCurrency;
transactionFormEl.addEventListener("submit", addTransaction);
currencySelect.addEventListener("change", handleCurrencyChange);


function setType(type) {
  transactionType = type;

  if (type === "income") {
    incomeBtn.classList.add("active");
    expenseBtn.classList.remove("active");
  } else {
    expenseBtn.classList.add("active");
    incomeBtn.classList.remove("active");
  }
}

incomeBtn.onclick = () => setType("income");
expenseBtn.onclick = () => setType("expense");


let touchStartX = 0;

transactionFormEl.addEventListener("touchstart", e => {
  touchStartX = e.changedTouches[0].screenX;
});

transactionFormEl.addEventListener("touchend", e => {
  const touchEndX = e.changedTouches[0].screenX;
  const diff = touchEndX - touchStartX;

  if (Math.abs(diff) > 50) {
    diff > 0 ? setType("income") : setType("expense");
  }
});


async function fetchExchangeRates() {
  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${BASE_CURRENCY}`
    );
    const data = await res.json();
    EXCHANGE_RATES = data.conversion_rates;
    saveAndRender();
  } catch (err) {
    console.error("FX fetch failed");
  }
}


function addTransaction(e) {
  e.preventDefault();

  const description = descriptionEl.value.trim();
  const rawValue = amountEl.value.trim();
  let inputAmount = parseFloat(rawValue);

  if (!description || isNaN(inputAmount)) return;

  if (transactionType === "expense") {
    inputAmount = -inputAmount;
  }

  const amountUSD = inputAmount / EXCHANGE_RATES[currentCurrency];

  transactions.push({
    id: Date.now(),
    description,
    amountUSD
  });

  saveAndRender();
  transactionFormEl.reset();
}

/* ===== REMOVE ===== */
function removeTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveAndRender();
}

/* ===== UI UPDATE ===== */
function formatCurrencyFromUSD(usd) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currentCurrency,
    minimumFractionDigits: currentCurrency === "JPY" ? 0 : 2
  }).format(usd * EXCHANGE_RATES[currentCurrency]);
}

function updateTransactionList() {
  transactionListEl.innerHTML = "";
  [...transactions].reverse().forEach(t => {
    const li = document.createElement("li");
    li.className = `transaction ${t.amountUSD > 0 ? "income" : "expense"}`;
    li.innerHTML = `
      <span>${t.description}</span>
      <span>${formatCurrencyFromUSD(t.amountUSD)}
        <button onclick="removeTransaction(${t.id})">×</button>
      </span>
    `;
    transactionListEl.appendChild(li);
  });
}

function updateSummary() {
  const balance = transactions.reduce((a, t) => a + t.amountUSD, 0);
  const income = transactions.filter(t => t.amountUSD > 0).reduce((a, t) => a + t.amountUSD, 0);
  const expense = transactions.filter(t => t.amountUSD < 0).reduce((a, t) => a + t.amountUSD, 0);

  balanceEl.textContent = formatCurrencyFromUSD(balance);
  incomeAmountEl.textContent = formatCurrencyFromUSD(income);
  expenseAmountEl.textContent = formatCurrencyFromUSD(expense);
}

function updateChart() {
  const canvas = document.getElementById("expenseChart");
  if (!canvas) return;

  const income = transactions.filter(t => t.amountUSD > 0).reduce((a, t) => a + t.amountUSD, 0);
  const expense = Math.abs(transactions.filter(t => t.amountUSD < 0).reduce((a, t) => a + t.amountUSD, 0));

  if (expenseChart) expenseChart.destroy();

  expenseChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Income", "Expenses"],
      datasets: [{
        data: [
          income * EXCHANGE_RATES[currentCurrency],
          expense * EXCHANGE_RATES[currentCurrency]
        ],
        backgroundColor: ["#059669", "#dc2626"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
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
