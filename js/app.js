// 간단 가계부 - localStorage 기반 저장
const STORAGE_KEY = "simple-ledger-entries";

const CATEGORIES = {
  expense: ["식비", "교통", "쇼핑", "주거", "문화생활", "의료", "기타"],
  income: ["급여", "용돈", "부수입", "기타"],
};

let entries = loadEntries();
let currentType = "expense";
let viewDate = new Date(); // 현재 보고 있는 월

const dateInput = document.getElementById("date");
const categorySelect = document.getElementById("category");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");
const entryForm = document.getElementById("entryForm");
const entryList = document.getElementById("entryList");
const emptyState = document.getElementById("emptyState");
const entryCount = document.getElementById("entryCount");
const currentMonthLabel = document.getElementById("currentMonth");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const totalBalanceEl = document.getElementById("totalBalance");

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load entries", e);
    return [];
  }
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Failed to save entries", e);
  }
}

function formatWon(n) {
  return n.toLocaleString("ko-KR") + "원";
}

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function renderCategoryOptions() {
  categorySelect.innerHTML = "";
  CATEGORIES[currentType].forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}

function setType(type) {
  currentType = type;
  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
  renderCategoryOptions();
}

document.querySelectorAll(".type-btn").forEach((btn) => {
  btn.addEventListener("click", () => setType(btn.dataset.type));
});

document.getElementById("prevMonth").addEventListener("click", () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  render();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  render();
});

entryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = Number(amountInput.value);
  if (!amount || amount <= 0) return;

  entries.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: currentType,
    date: dateInput.value || todayStr(),
    category: categorySelect.value,
    amount,
    memo: memoInput.value.trim(),
  });

  saveEntries();
  amountInput.value = "";
  memoInput.value = "";
  amountInput.focus();

  // 방금 추가한 항목의 달로 이동해서 보여줌
  const addedDate = new Date(dateInput.value || todayStr());
  viewDate = new Date(addedDate.getFullYear(), addedDate.getMonth(), 1);

  render();
});

function deleteEntry(id) {
  entries = entries.filter((e) => e.id !== id);
  saveEntries();
  render();
}

function render() {
  currentMonthLabel.textContent = `${viewDate.getFullYear()}년 ${viewDate.getMonth() + 1}월`;

  const key = monthKey(viewDate);
  const monthEntries = entries
    .filter((e) => e.date.startsWith(key))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  let income = 0;
  let expense = 0;
  monthEntries.forEach((e) => {
    if (e.type === "income") income += e.amount;
    else expense += e.amount;
  });

  totalIncomeEl.textContent = formatWon(income);
  totalExpenseEl.textContent = formatWon(expense);
  totalBalanceEl.textContent = formatWon(income - expense);

  entryCount.textContent = `${monthEntries.length}건`;
  emptyState.classList.toggle("visible", monthEntries.length === 0);

  entryList.innerHTML = "";
  monthEntries.forEach((e) => {
    const li = document.createElement("li");
    li.className = `entry-item ${e.type}`;
    li.innerHTML = `
      <span class="cat-badge">${escapeHtml(e.category)}</span>
      <div class="entry-info">
        <div class="entry-memo">${escapeHtml(e.memo) || escapeHtml(e.category)}</div>
        <div class="entry-date">${e.date}</div>
      </div>
      <span class="entry-amount">${e.type === "income" ? "+" : "-"}${formatWon(e.amount)}</span>
      <button class="delete-btn" aria-label="삭제" data-id="${e.id}">✕</button>
    `;
    entryList.appendChild(li);
  });

  entryList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteEntry(btn.dataset.id));
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// 초기화
dateInput.value = todayStr();
renderCategoryOptions();
render();
