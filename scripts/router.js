// =========================================================
// Arquivo: scripts/router.js
// Descrição: Lógica de roteamento da aplicação.
// Importa as funções de views e utilidades para gerenciar a navegação.
// =========================================================
import { $$, $, toast } from "./utils.js";
import { State } from "./state.js";
import {
  renderDashboard,
  renderRelatorios,
  renderTransactions,
  renderMetas,
  renderAccounts,
  renderRecurringTx,
  renderCategories,
  renderProfile,
} from "./views.js";

// Mapeamento das rotas para as funções de renderização.
const Routes = {
  dashboard: renderDashboard,
  relatorios: renderRelatorios,
  extrato: renderTransactions,
  metas: renderMetas,
  contas: renderAccounts,
  recorrentes: renderRecurringTx,
  perfil: renderProfile,
  categorias: renderCategories,
};

// Aplica o tema (claro/escuro) na página.
export function setTheme(theme) {
  document.body.dataset.theme = theme;
  const icon = $("#themeToggle .material-symbols-outlined");
  icon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
}

// Marca o item de navegação ativo na barra inferior.
function setActiveNav() {
  $$(".bottomnav a").forEach((a) => a.classList.remove("active"));
  const hash = location.hash.replace("#/", "") || "dashboard";
  const el = document.getElementById("nav-" + hash);
  if (el) el.classList.add("active");
}

// Checa e adiciona transações recorrentes ao estado, se necessário.
function checkRecurringTx() {
  const now = new Date();
  let changed = false;
  State.data.recurringTx.forEach((rtx) => {
    const last = new Date(rtx.lastAddedDate);
    let shouldAdd = false;
    if (
      (rtx.frequency === "monthly" && now.getMonth() !== last.getMonth()) ||
      now.getFullYear() !== last.getFullYear()
    ) {
      shouldAdd = true;
    } else if (
      rtx.frequency === "weekly" &&
      now.getDate() - last.getDate() >= 7
    ) {
      shouldAdd = true;
    }

    if (shouldAdd) {
      const account = State.data.accounts.find(
        (acc) => acc.id === rtx.accountId
      );
      if (account) {
        account.balance +=
          rtx.type === "crédito" ? Math.abs(rtx.amount) : -Math.abs(rtx.amount);
      }
      State.data.tx.push({
        id: uid(),
        date: now.toISOString(),
        type: rtx.type,
        category: rtx.category,
        desc: rtx.name,
        amount: rtx.amount,
        accountId: rtx.accountId,
      });
      rtx.lastAddedDate = now.toISOString();
      changed = true;
    }
  });

  if (changed) {
    State.save();
    toast("Transações recorrentes adicionadas!");
  }
}

// Função principal de navegação. Lida com a mudança de hash da URL.
export function navigate() {
  setActiveNav();
  checkRecurringTx();
  const hash = (location.hash || "#/dashboard").replace("#/", "");
  const view = $("#view");
  view.classList.add("fade-out");
  setTimeout(() => {
    const fn = Routes[hash] || Routes.dashboard;
    view.innerHTML = "";
    fn(view);
    view.classList.remove("fade-out");
  }, 300);
}
