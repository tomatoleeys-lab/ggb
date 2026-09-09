// Supabase 연결 - REST(PostgREST) API를 fetch로 직접 호출한다.
// 별도 SDK를 로드하지 않으므로 바닐라 JS 구성이 유지된다.
const SUPABASE_URL = "https://fqwukshentjaispulmws.supabase.co";
// publishable(anon) 키 - 브라우저에 노출되는 공개 키. 권한은 RLS 정책으로 제한된다.
const SUPABASE_KEY = "sb_publishable_J7fWOq2TqGBfb4kD5CvBAg_GwZhwUFO";

const REST_URL = `${SUPABASE_URL}/rest/v1`;
const BUDGET_ROW_ID = "default"; // 예산은 단일 행으로 관리

async function request(path, { method = "GET", body, prefer } = {}) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(`${REST_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase ${method} ${path} 실패 (${res.status}) ${detail}`);
  }

  // 204 No Content 등 본문이 없는 응답 처리
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// DB의 numeric은 문자열로 오므로 숫자로 변환해서 쓴다.
function normalizeEntry(row) {
  return {
    id: row.id,
    type: row.type,
    date: row.date,
    category: row.category,
    amount: Number(row.amount),
    memo: row.memo || "",
  };
}

const DB = {
  async listEntries() {
    const rows = await request("/entries?select=*&order=date.desc,created_at.desc");
    return (rows || []).map(normalizeEntry);
  },

  async addEntry(entry) {
    const rows = await request("/entries", {
      method: "POST",
      body: entry,
      prefer: "return=representation",
    });
    return normalizeEntry(rows[0]);
  },

  async addEntries(list) {
    const rows = await request("/entries", {
      method: "POST",
      body: list,
      prefer: "return=representation",
    });
    return (rows || []).map(normalizeEntry);
  },

  async deleteEntry(id) {
    await request(`/entries?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async getBudget() {
    const rows = await request(`/budgets?select=*&id=eq.${BUDGET_ROW_ID}`);
    const row = rows && rows[0];
    if (!row) return { total: 0, categories: {} };
    return { total: Number(row.total), categories: row.categories || {} };
  },

  async saveBudget(budget) {
    await request("/budgets", {
      method: "POST",
      body: {
        id: BUDGET_ROW_ID,
        total: budget.total,
        categories: budget.categories,
        updated_at: new Date().toISOString(),
      },
      prefer: "resolution=merge-duplicates",
    });
  },
};
