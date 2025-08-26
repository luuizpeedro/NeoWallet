// =========================================================
// Arquivo: scripts/utils.js
// Descrição: Funções utilitárias e ajudantes globais.
// Exporta todas as funções para serem usadas em outros arquivos.
// =========================================================
export const $ = (s) => document.querySelector(s);
export const $$ = (s) => document.querySelectorAll(s);

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function formatBRL(v) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.style.display = "none"), 2200);
}

export function emptyState(message, icon) {
  return `
      <div class="empty-state">
          <span class="material-symbols-outlined" style="font-size: 4rem;">${icon}</span>
          <p class="subtitle">${message}</p>
      </div>
  `;
}

export function txItem(t) {
  const sign = t.amount >= 0 ? "plus" : "minus";
  const date = new Date(t.date).toLocaleDateString("pt-BR");
  const account =
    State.data.accounts.find((acc) => acc.id === t.accountId)?.name || "N/A";
  return `<div class="item" role="listitem">
  <div class="left">
    <div class="dot"></div>
    <div>
      <div class="title">${t.category}</div>
      <div class="subtitle">${t.desc} • ${date} • ${account}</div>
    </div>
  </div>
  <div class="amount ${sign}">${t.amount >= 0 ? "+" : ""}${formatBRL(
    t.amount
  )}</div>
</div>`;
}
