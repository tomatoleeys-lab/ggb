// 간단 가계부 - localStorage 기반 저장
const STORAGE_KEY = "simple-ledger-entries";
const STORAGE_KEY_BUDGET = "simple-ledger-budget";
const STORAGE_KEY_THEME = "simple-ledger-theme";

const RING_CIRCUMFERENCE = 326.73; // 2 * π * r(52)

const CATEGORIES = {
  expense: ["식비", "교통", "쇼핑", "주거", "문화생활", "의료", "기타"],
  income: ["급여", "용돈", "부수입", "기타"],
};

// 카테고리별 아이콘 / 대표 색상
const CATEGORY_META = {
  식비: { icon: "🍚", color: "#f97316" },
  교통: { icon: "🚌", color: "#3b82f6" },
  쇼핑: { icon: "🛍️", color: "#ec4899" },
  주거: { icon: "🏠", color: "#8b5cf6" },
  문화생활: { icon: "🎬", color: "#06b6d4" },
  의료: { icon: "💊", color: "#10b981" },
  급여: { icon: "💼", color: "#0d9488" },
  용돈: { icon: "🎁", color: "#f59e0b" },
  부수입: { icon: "💡", color: "#0ea5e9" },
  기타: { icon: "📦", color: "#64748b" },
};

function metaOf(category) {
  return CATEGORY_META[category] || { icon: "📦", color: "#64748b" };
}

let entries = loadEntries();
let budget = loadBudget(); // { total: number, categories: { [category]: number } }
let currentType = "expense";
let selectedCategory = CATEGORIES.expense[0];
let viewDate = new Date(); // 현재 보고 있는 월

const dateInput = document.getElementById("date");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");
const entryForm = document.getElementById("entryForm");
const entryList = document.getElementById("entryList");
const emptyState = document.getElementById("emptyState");
const entryCount = document.getElementById("entryCount");
const currentMonthLabel = document.getElementById("currentMonth");
const segmented = document.getElementById("segmented");
const categoryChips = document.getElementById("categoryChips");
const demoBtn = document.getElementById("demoBtn");

const heroBalance = document.getElementById("heroBalance");
const heroIncome = document.getElementById("heroIncome");
const heroExpense = document.getElementById("heroExpense");
const dailyChart = document.getElementById("dailyChart");
const chartPeak = document.getElementById("chartPeak");
const heroTopCats = document.getElementById("heroTopCats");

const ringFill = document.getElementById("ringFill");
const ringPercent = document.getElementById("ringPercent");
const budgetTotalValue = document.getElementById("budgetTotalValue");
const budgetSpentValue = document.getElementById("budgetSpentValue");
const budgetRemainKey = document.getElementById("budgetRemainKey");
const budgetRemainValue = document.getElementById("budgetRemainValue");
const budgetHint = document.getElementById("budgetHint");
const categoryBudgetList = document.getElementById("categoryBudgetList");

const budgetModal = document.getElementById("budgetModal");
const budgetSettingsBtn = document.getElementById("budgetSettingsBtn");
const totalBudgetInput = document.getElementById("totalBudgetInput");
const categoryBudgetInputs = document.getElementById("categoryBudgetInputs");
const budgetSaveBtn = document.getElementById("budgetSaveBtn");
const budgetCancelBtn = document.getElementById("budgetCancelBtn");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

/* ===== 저장 / 불러오기 ===== */
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

function loadBudget() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUDGET);
    return raw ? JSON.parse(raw) : { total: 0, categories: {} };
  } catch (e) {
    console.error("Failed to load budget", e);
    return { total: 0, categories: {} };
  }
}

function saveBudget() {
  try {
    localStorage.setItem(STORAGE_KEY_BUDGET, JSON.stringify(budget));
  } catch (e) {
    console.error("Failed to save budget", e);
  }
}

/* ===== 유틸 ===== */
function formatWon(n) {
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function formatDateLabel(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function budgetState(spent, total) {
  const ratio = total > 0 ? spent / total : 0;
  if (ratio > 1) return "over";
  if (ratio >= 0.9) return "warning";
  return "normal";
}

/* ===== 테마 ===== */
function applyTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
  if (!persist) return;
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  } catch (e) {}
}

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
});

/* ===== 카테고리 칩 ===== */
function renderCategoryChips() {
  categoryChips.innerHTML = "";
  CATEGORIES[currentType].forEach((cat) => {
    const { icon, color } = metaOf(cat);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (cat === selectedCategory ? " active" : "");
    btn.style.setProperty("--chip-c", color);
    btn.style.setProperty("--chip-bg", color + "1a");
    btn.innerHTML = `
      <span class="chip-icon">${icon}</span>
      <span class="chip-name">${escapeHtml(cat)}</span>
    `;
    btn.addEventListener("click", () => {
      selectedCategory = cat;
      renderCategoryChips();
    });
    categoryChips.appendChild(btn);
  });
}

function setType(type) {
  currentType = type;
  segmented.classList.toggle("income", type === "income");
  segmented.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
  selectedCategory = CATEGORIES[type][0];
  renderCategoryChips();
}

segmented.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => setType(btn.dataset.type));
});

/* ===== 월 이동 ===== */
document.getElementById("prevMonth").addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  render();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  render();
});

/* ===== 예산 설정 모달 ===== */
function openBudgetModal() {
  totalBudgetInput.value = budget.total || "";

  categoryBudgetInputs.innerHTML = "";
  CATEGORIES.expense.forEach((cat) => {
    const { icon } = metaOf(cat);
    const row = document.createElement("div");
    row.className = "cat-input-row";
    row.innerHTML = `
      <span class="cat-label"><span>${icon}</span>${escapeHtml(cat)}</span>
      <input type="number" id="catBudget-${cat}" min="0" step="10000" placeholder="미설정"
             value="${budget.categories[cat] || ""}" />
    `;
    categoryBudgetInputs.appendChild(row);
  });

  budgetModal.classList.remove("hidden");
}

function closeBudgetModal() {
  budgetModal.classList.add("hidden");
}

function saveBudgetFromModal() {
  const next = { total: Number(totalBudgetInput.value) || 0, categories: {} };
  CATEGORIES.expense.forEach((cat) => {
    const val = Number(document.getElementById(`catBudget-${cat}`).value) || 0;
    if (val > 0) next.categories[cat] = val;
  });
  budget = next;
  saveBudget();
  closeBudgetModal();
  render();
}

budgetSettingsBtn.addEventListener("click", openBudgetModal);
budgetCancelBtn.addEventListener("click", closeBudgetModal);
budgetSaveBtn.addEventListener("click", saveBudgetFromModal);
budgetModal.addEventListener("click", (e) => {
  if (e.target === budgetModal) closeBudgetModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !budgetModal.classList.contains("hidden")) closeBudgetModal();
});

/* ===== 내역 추가 / 삭제 ===== */
entryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = Number(amountInput.value);
  if (!amount || amount <= 0) return;

  entries.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: currentType,
    date: dateInput.value || todayStr(),
    category: selectedCategory,
    amount,
    memo: memoInput.value.trim(),
  });

  saveEntries();
  amountInput.value = "";
  memoInput.value = "";
  amountInput.focus();

  // 방금 추가한 항목의 달로 이동해서 보여줌
  const added = new Date(dateInput.value || todayStr());
  viewDate = new Date(added.getFullYear(), added.getMonth(), 1);

  render();
});

function deleteEntry(id) {
  entries = entries.filter((e) => e.id !== id);
  saveEntries();
  render();
}

/* ===== 데모 데이터 ===== */
const DEMO_BUDGET = {
  total: 1500000,
  categories: { 식비: 350000, 교통: 80000, 쇼핑: 150000, 주거: 650000, 문화생활: 100000 },
};

const DEMO_ITEMS = [
  { type: "income", category: "급여", amount: 3200000, memo: "이번 달 급여", day: 25 },
  { type: "income", category: "부수입", amount: 180000, memo: "블로그 수익", day: 18 },
  { type: "expense", category: "주거", amount: 650000, memo: "월세", day: 1 },
  { type: "expense", category: "식비", amount: 42000, memo: "장보기", day: 3 },
  { type: "expense", category: "교통", amount: 55000, memo: "교통카드 충전", day: 4 },
  { type: "expense", category: "식비", amount: 13500, memo: "점심 - 김치찌개", day: 8 },
  { type: "expense", category: "문화생활", amount: 32000, memo: "영화 2인", day: 12 },
  { type: "expense", category: "쇼핑", amount: 89000, memo: "가을 니트", day: 14 },
  { type: "expense", category: "식비", amount: 28000, memo: "친구와 저녁", day: 16 },
  { type: "expense", category: "의료", amount: 15000, memo: "감기약", day: 20 },
  { type: "expense", category: "기타", amount: 12900, memo: "구독 서비스", day: 22 },
];

function buildDemoEntries(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return DEMO_ITEMS.map((d, i) => ({
    id: `demo-${i}`,
    type: d.type,
    date: `${y}-${pad2(m + 1)}-${pad2(Math.min(d.day, lastDay))}`,
    category: d.category,
    amount: d.amount,
    memo: d.memo,
  }));
}

// persist: true → 기존 내역에 추가하고 저장 / false → 화면에만 표시 (저장된 데이터 보존)
function applyDemoData(persist) {
  const demo = buildDemoEntries(viewDate);

  if (persist) {
    entries = entries.concat(
      demo.map((d, i) => ({ ...d, id: `demo-${Date.now().toString(36)}-${i}` }))
    );
    saveEntries();
    if (!budget.total) {
      budget = DEMO_BUDGET;
      saveBudget();
    }
  } else {
    entries = demo;
    budget = DEMO_BUDGET;
  }

  render();
}

demoBtn.addEventListener("click", () => applyDemoData(true));

/* ===== 렌더링 ===== */
function render() {
  currentMonthLabel.textContent = `${viewDate.getFullYear()}년 ${viewDate.getMonth() + 1}월`;

  const key = monthKey(viewDate);
  const monthEntries = entries
    .filter((e) => e.date.startsWith(key))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  let income = 0;
  let expense = 0;
  const categoryTotals = {};
  monthEntries.forEach((e) => {
    if (e.type === "income") {
      income += e.amount;
    } else {
      expense += e.amount;
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    }
  });

  heroBalance.textContent = formatWon(income - expense);
  heroIncome.textContent = formatWon(income);
  heroExpense.textContent = formatWon(expense);

  renderDailyChart(monthEntries);
  renderTopCategories(categoryTotals, expense);
  renderBudget(expense, categoryTotals);
  renderEntries(monthEntries);
}

// 지출 비중 상위 3개 카테고리
function renderTopCategories(categoryTotals, expense) {
  heroTopCats.innerHTML = "";
  if (expense <= 0) return;

  Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([cat, amount]) => {
      const { icon } = metaOf(cat);
      const row = document.createElement("div");
      row.className = "top-cat";
      row.innerHTML = `
        <span class="tc-icon">${icon}</span>
        <span class="tc-name">${escapeHtml(cat)}</span>
        <span class="tc-amount">${formatWon(amount)}</span>
        <span class="tc-share">${Math.round((amount / expense) * 100)}%</span>
      `;
      heroTopCats.appendChild(row);
    });
}

// 이번 달 일별 지출 막대 차트
function renderDailyChart(monthEntries) {
  const days = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const perDay = new Array(days).fill(0);

  monthEntries.forEach((e) => {
    if (e.type !== "expense") return;
    const day = Number(e.date.split("-")[2]);
    if (day >= 1 && day <= days) perDay[day - 1] += e.amount;
  });

  const max = Math.max(...perDay);
  const peakDay = max > 0 ? perDay.indexOf(max) + 1 : 0;

  chartPeak.textContent = max > 0 ? `최대 ${peakDay}일 ${formatWon(max)}` : "지출 없음";

  dailyChart.innerHTML = "";
  perDay.forEach((amount, i) => {
    const bar = document.createElement("div");
    bar.className = "d-bar" + (max > 0 && amount === max ? " peak" : "");
    bar.style.height = max > 0 ? `${Math.max((amount / max) * 100, 1.5)}%` : "1.5%";
    bar.title = `${i + 1}일 · ${formatWon(amount)}`;
    dailyChart.appendChild(bar);
  });
}

function renderBudget(expense, categoryTotals) {
  const total = budget.total || 0;
  budgetSpentValue.textContent = formatWon(expense);

  if (total > 0) {
    const ratio = expense / total;
    const state = budgetState(expense, total);
    const remain = total - expense;

    ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - Math.min(ratio, 1));
    ringFill.className.baseVal = "ring-fill" + (state === "normal" ? "" : " " + state);
    ringPercent.textContent = `${Math.round(ratio * 100)}%`;

    budgetTotalValue.textContent = formatWon(total);
    budgetRemainKey.textContent = remain >= 0 ? "남은 예산" : "초과 금액";
    budgetRemainValue.textContent = formatWon(Math.abs(remain));
    budgetRemainValue.className = remain >= 0 ? "" : "v-over";

    if (state === "over") {
      budgetHint.className = "budget-hint alert";
      budgetHint.textContent = `예산을 ${formatWon(-remain)} 초과했어요. 지출을 점검해보세요.`;
    } else if (state === "warning") {
      budgetHint.className = "budget-hint warn";
      budgetHint.textContent = `예산의 ${Math.round(ratio * 100)}%를 사용했어요. 남은 예산은 ${formatWon(remain)}입니다.`;
    } else {
      budgetHint.className = "budget-hint";
      budgetHint.textContent = `예산 대비 ${Math.round(ratio * 100)}% 사용 중이에요. 잘 관리되고 있어요 👍`;
    }
  } else {
    ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE;
    ringFill.className.baseVal = "ring-fill";
    ringPercent.textContent = "0%";

    budgetTotalValue.textContent = "미설정";
    budgetRemainKey.textContent = "남은 예산";
    budgetRemainValue.textContent = "—";
    budgetRemainValue.className = "";

    budgetHint.className = "budget-hint";
    budgetHint.textContent = "‘예산 설정’에서 총 예산을 입력하면 사용률이 표시됩니다.";
  }

  // 카테고리별 예산 / 지출
  categoryBudgetList.innerHTML = "";
  const rows = CATEGORIES.expense.filter(
    (cat) => (budget.categories[cat] || 0) > 0 || (categoryTotals[cat] || 0) > 0
  );

  rows.forEach((cat) => {
    const spent = categoryTotals[cat] || 0;
    const catBudget = budget.categories[cat] || 0;
    const { color } = metaOf(cat);
    const li = document.createElement("li");

    if (catBudget > 0) {
      const state = budgetState(spent, catBudget);
      const percent = Math.min((spent / catBudget) * 100, 100);
      const barColor =
        state === "over" ? "var(--expense)" : state === "warning" ? "var(--warning)" : color;
      li.innerHTML = `
        <div class="cat-row-top">
          <span class="cat-dot" style="background:${color}"></span>
          <span class="cat-name">${escapeHtml(cat)}</span>
          <span class="cat-nums${state === "over" ? " over" : ""}">
            ${formatWon(spent)} / ${formatWon(catBudget)}
          </span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${percent}%; background:${barColor}"></div>
        </div>
      `;
    } else {
      li.innerHTML = `
        <div class="cat-row-top">
          <span class="cat-dot" style="background:${color}"></span>
          <span class="cat-name">${escapeHtml(cat)}</span>
          <span class="cat-nums">${formatWon(spent)} · 예산 미설정</span>
        </div>
      `;
    }
    categoryBudgetList.appendChild(li);
  });
}

function renderEntries(monthEntries) {
  entryCount.textContent = `${monthEntries.length}건`;
  emptyState.classList.toggle("visible", monthEntries.length === 0);

  entryList.innerHTML = "";
  monthEntries.forEach((e, i) => {
    const { icon, color } = metaOf(e.category);
    const li = document.createElement("li");
    li.className = `entry-item ${e.type}`;
    li.style.animationDelay = `${Math.min(i * 0.03, 0.4)}s`;
    li.innerHTML = `
      <span class="entry-icon" style="background:${color}1f; color:${color}">${icon}</span>
      <div class="entry-info">
        <div class="entry-memo">${escapeHtml(e.memo) || escapeHtml(e.category)}</div>
        <div class="entry-sub">${escapeHtml(e.category)} · ${formatDateLabel(e.date)}</div>
      </div>
      <span class="entry-amount">${e.type === "income" ? "+" : "−"}${formatWon(e.amount)}</span>
      <button class="del-btn" aria-label="삭제" data-id="${e.id}">✕</button>
    `;
    entryList.appendChild(li);
  });

  entryList.querySelectorAll(".del-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteEntry(btn.dataset.id));
  });
}

/* ===== 초기화 ===== */
(function init() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY_THEME);
  } catch (e) {}
  applyTheme(saved || "light");

  dateInput.value = todayStr();
  ringFill.style.strokeDasharray = RING_CIRCUMFERENCE;
  setType("expense");

  // ?demo=1 : 저장된 데이터를 건드리지 않고 데모 화면만 표시 (스크린샷용)
  const params = new URLSearchParams(location.search);
  if (params.has("demo")) {
    if (params.get("theme") === "dark") applyTheme("dark", false);
    applyDemoData(false);
  } else {
    render();
  }
})();
