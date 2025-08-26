// Arquivo: scripts/views.js
// Descrição: Funções para renderizar as diferentes telas.
// Importa o estado e as funções utilitárias e de UI.
// =========================================================
import { $, $$, formatBRL, emptyState, txItem, uid } from "./utils.js";
import { State } from "./state.js";
import { navigate, setTheme, checkRecurringTx } from "./router.js";
import { openModal } from "./ui.js";

export function exportCSV() {
  const now = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const header = [
    `NeoWallet - Extrato Financeiro`,
    `Data de Exportação: ${now}`,
    ``,
  ];
  const rows = [
    ["ID", "Data", "Tipo", "Categoria", "Descrição", "Valor", "Conta"],
  ];
  State.data.tx.forEach((t) => {
    const txDate = new Date(t.date).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
    const accountName =
      State.data.accounts.find((acc) => acc.id === t.accountId)?.name || "N/A";
    rows.push([
      t.id,
      txDate,
      t.type,
      t.category,
      t.desc,
      t.amount.toFixed(2),
      accountName,
    ]);
  });
  const csvContent =
    header.join("\n") +
    "\n" +
    rows
      .map((r) =>
        r.map((c) => `"${c.toString().replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "extrato_neowallet.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("CSV exportado");
}

function getTotalBalance() {
  return State.data.accounts.reduce((sum, account) => sum + account.balance, 0);
}

function getBalanceHistory() {
  const sortedTx = State.data.tx.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  if (sortedTx.length === 0) return [];
  const history = [];
  let currentBalance = State.data.accounts.reduce((sum, acc) => {
    const pastTx = sortedTx.filter((t) => new Date(t.date) > new Date());
    return sum + acc.balance - pastTx.reduce((s, t) => s + t.amount, 0);
  }, 0);
  history.push({
    date: new Date().toISOString(),
    balance: currentBalance,
  });
  const now = new Date();
  for (let i = sortedTx.length - 1; i >= 0; i--) {
    if (new Date(sortedTx[i].date) < now) {
      currentBalance -= sortedTx[i].amount;
      history.unshift({
        date: sortedTx[i].date,
        balance: currentBalance,
      });
    }
  }
  return history;
}

function checkAlerts() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let alerts = [];
  const monthlyExpenses = State.data.tx
    .filter((t) => t.amount < 0 && new Date(t.date) >= startOfMonth)
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {});
  State.data.categories.forEach((cat) => {
    if (cat.budget > 0) {
      const spent = monthlyExpenses[cat.name] || 0;
      const progress = spent / cat.budget;
      if (progress >= 1) {
        alerts.push(`O orçamento de **${cat.name}** foi atingido!`);
      } else if (progress >= 0.8) {
        alerts.push(
          `Atenção: o orçamento de **${cat.name}** está quase no limite.`
        );
      }
    }
  });
  State.data.goals.forEach((goal) => {
    const deadline = new Date(goal.deadline);
    const remainingDays = (deadline - now) / (1000 * 60 * 60 * 24);
    if (remainingDays > 0 && remainingDays <= 30 && goal.saved < goal.target) {
      alerts.push(
        `Faltam ${Math.round(remainingDays)} dias para o prazo da meta **${
          goal.name
        }**.`
      );
    }
  });
  if (alerts.length === 0) return "";
  return alerts
    .map(
      (msg) =>
        `<div class="item"><div class="left"><span class="material-symbols-outlined" style="color: var(--danger);">warning</span><div class="subtitle">${msg}</div></div></div>`
    )
    .join("");
}

export function renderDashboard(root) {
  const d = State.data;
  $("#greeting").textContent = `Olá, ${d.profile.name}`;
  const totalBalance = getTotalBalance();
  const balanceValue = d.balanceVisible ? formatBRL(totalBalance) : "••••••";
  const accountOptions = d.accounts
    .map((acc) => `<option value="${acc.id}">${acc.name}</option>`)
    .join("");
  const alertsHTML = checkAlerts();
  const listHTML = d.tx
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)
    .map(txItem)
    .join("");
  root.innerHTML = `
    ${
      alertsHTML
        ? `<section class="card" style="margin-bottom: 12px;"><div class="section-title" style="color: var(--danger);">Alertas</div><div class="list">${alertsHTML}</div></section>`
        : ""
    }
    <section class="card" aria-label="Resumo do Saldo">
      <div class="col">
        <div>
        <div class="badge">Saldo Total</div>
        <div class="balance ${
          !d.balanceVisible ? "masked" : ""
        }" id="balanceValue">${balanceValue}</div>
        </div>
        <div class="row center" style="gap:8px; margin-top: 16px; justify-content: flex-end;">
        <button class="btn icon" aria-label="Mostrar/Ocultar saldo" onclick="toggleBalanceVisibility()">
          ${
            d.balanceVisible
              ? '<span class="material-symbols-outlined">visibility_off</span>'
              : '<span class="material-symbols-outlined">visibility</span>'
          }
        </button>
        <button class="btn" aria-label="Adicionar movimentação" onclick="uiAddTx()">Adicionar movimentação</button>
        </div>
      </div>
    </section>
    <section class="card" style="margin-top:12px" aria-label="Extrato recente">
      <div class="row center" style="justify-content:space-between;">
        <div class="section-title">Movimentações recentes</div>
        <div class="row center" style="gap:8px">
          <select id="txFilter" class="input" aria-label="Filtro de período">
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="all">Tudo</option>
          </select>
          <select id="accountFilter" class="input" aria-label="Filtro de conta">
            <option value="all">Todas as Contas</option>
            ${accountOptions}
          </select>
          <input id="txSearch" class="input" placeholder="Buscar" aria-label="Buscar" />
        </div>
      </div>
      <div id="txList" class="list" style="margin-top:8px">${
        listHTML || emptyState("Nenhuma movimentação para exibir.", "list_alt")
      }</div>
    </section>
  `;
  const updateTxList = () => {
    const days = $("#txFilter").value;
    const accountId = $("#accountFilter").value;
    const q = ($("#txSearch").value || "").toLowerCase();
    const now = new Date();
    const items = State.data.tx
      .filter((t) => {
        const inDays =
          days === "all"
            ? true
            : (now - new Date(t.date)) / (1000 * 60 * 60 * 24) <=
              parseInt(days);
        const matchesAccount =
          accountId === "all" ? true : t.accountId === accountId;
        const matches = (t.category + " " + t.desc).toLowerCase().includes(q);
        return inDays && matchesAccount && matches;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    $("#txList").innerHTML =
      items.map(txItem).join("") ||
      emptyState("Nenhuma movimentação para exibir.", "list_alt");
  };
  $("#txFilter").addEventListener("change", updateTxList);
  $("#accountFilter").addEventListener("change", updateTxList);
  $("#txSearch").addEventListener("input", updateTxList);
}

export function renderRelatorios(root) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTx = State.data.tx.filter(
    (t) => new Date(t.date) >= startOfMonth
  );
  const totalReceita = thisMonthTx
    .filter((t) => t.type === "crédito")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDespesa = thisMonthTx
    .filter((t) => t.type === "débito")
    .reduce((sum, t) => sum + t.amount, 0);
  root.innerHTML = `
        <div class="card" style="margin-bottom:12px;">
            <div class="section-title">Resumo do Mês</div>
            <div class="row wrap center">
                <div class="col" style="flex:1;">
                    <span class="subtitle" style="color: var(--success);">Receita Total</span>
                    <div style="font-size:1.2rem; font-weight:700;">${formatBRL(
                      totalReceita
                    )}</div>
                </div>
                <div class="col" style="flex:1;">
                    <span class="subtitle" style="color: var(--danger);">Despesa Total</span>
                    <div style="font-size:1.2rem; font-weight:700;">${formatBRL(
                      totalDespesa
                    )}</div>
                </div>
            </div>
        </div>
        <div class="grid-2">
            <section class="card" aria-label="Gastos do mês">
                <div class="section-title">Gastos por Categoria (${now.toLocaleString(
                  "pt-BR",
                  { month: "long" }
                )})</div>
                ${
                  monthlyExpenseSummary() ||
                  emptyState("Não há gastos registrados este mês.", "pie_chart")
                }
            </section>
            <section class="card" aria-label="Evolução do Saldo">
                <div class="section-title">Evolução do Saldo</div>
                <div id="chart" style="min-height: 200px">${renderBalanceChart()}</div>
            </section>
        </div>
        <section class="card" style="margin-top:12px;">
            <div class="section-title">Gráfico de Pizza</div>
            ${
              renderPieChart() ||
              emptyState("Não há despesas para exibir no gráfico.", "pie_chart")
            }
        </section>
    `;
}

function renderBalanceChart() {
  const balanceHistory = getBalanceHistory();
  if (balanceHistory.length < 2) {
    return emptyState(
      "Adicione mais movimentações para ver o gráfico.",
      "analytics"
    );
  }
  const dates = balanceHistory.map((d) => d.date);
  const balances = balanceHistory.map((d) => d.balance);
  const svgWidth = 250;
  const svgHeight = 200;
  const margin = { top: 10, right: 10, bottom: 20, left: 50 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const yScale = (balance) =>
    chartHeight -
    ((balance - minBalance) / (maxBalance - minBalance)) * chartHeight +
    margin.top;
  let pathData = "";
  if (balances.length > 0) {
    pathData = balances
      .map((balance, i) => {
        const x = (i / (balances.length - 1)) * chartWidth + margin.left;
        const y = yScale(balance);
        return `${i === 0 ? "M" : "L"} ${x},${y}`;
      })
      .join(" ");
  }
  return `
        <svg width="100%" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
          <path d="${pathData}" fill="none" stroke="var(--primary)" stroke-width="2" />
          <g class="y-axis">
            <text x="0" y="${
              yScale(minBalance) + 5
            }" font-size="10" fill="var(--muted)">${formatBRL(
    minBalance
  )}</text>
            <text x="0" y="${
              yScale(maxBalance) + 5
            }" font-size="10" fill="var(--muted)">${formatBRL(
    maxBalance
  )}</text>
          </g>
        </svg>
      `;
}

function renderPieChart() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthExpenses = State.data.tx.filter(
    (t) => new Date(t.date) >= startOfMonth && t.amount < 0
  );
  if (thisMonthExpenses.length === 0) return "";
  const expensesByCategory = thisMonthExpenses.reduce((acc, tx) => {
    const cat = tx.category;
    acc[cat] = (acc[cat] || 0) + Math.abs(tx.amount);
    return acc;
  }, {});
  const totalExpenses = Object.values(expensesByCategory).reduce(
    (sum, val) => sum + val,
    0
  );
  if (totalExpenses === 0) return "";
  const colors = [
    "#4299e1",
    "#ed8936",
    "#48bb78",
    "#9f7aea",
    "#e53e3e",
    "#ecc94b",
    "#667eea",
  ];
  let startAngle = 0;
  let legendHTML = "";
  let slicesHTML = "";
  let colorIndex = 0;
  for (const category in expensesByCategory) {
    const value = expensesByCategory[category];
    const percentage = value / totalExpenses;
    const endAngle = startAngle + percentage * 360;
    const x1 = 50 + 40 * Math.cos((Math.PI * startAngle) / 180);
    const y1 = 50 + 40 * Math.sin((Math.PI * startAngle) / 180);
    const x2 = 50 + 40 * Math.cos((Math.PI * endAngle) / 180);
    const y2 = 50 + 40 * Math.sin((Math.PI * endAngle) / 180);
    const largeArcFlag = percentage > 0.5 ? 1 : 0;
    const color = colors[colorIndex % colors.length];
    slicesHTML += `<path d="M 50,50 L ${x1},${y1} A 40,40 0 ${largeArcFlag},1 ${x2},${y2} Z" fill="${color}" />`;
    legendHTML += `<li><span class="dot" style="background:${color}"></span>${category} (${(
      percentage * 100
    ).toFixed(1)}%)</li>`;
    startAngle = endAngle;
    colorIndex++;
  }
  return `
        <div class="row wrap center" style="justify-content:space-between">
            <div class="pie-chart">
                <svg viewBox="0 0 100 100">${slicesHTML}</svg>
            </div>
            <ul class="pie-chart-legend" style="flex:1">
                ${legendHTML}
            </ul>
        </div>
      `;
}

function monthlyExpenseSummary() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTx = State.data.tx.filter(
    (t) => new Date(t.date) >= startOfMonth
  );
  if (thisMonthTx.length === 0) {
    return emptyState("Não há gastos registrados neste mês.", "pie_chart");
  }
  const totalsByCategory = thisMonthTx.reduce((acc, tx) => {
    if (tx.amount < 0) {
      acc[tx.category] = (acc[tx.category] || 0) + Math.abs(tx.amount);
    }
    return acc;
  }, {});
  const categoriesHTML = State.data.categories
    .map((cat) => {
      const spent = totalsByCategory[cat.name] || 0;
      const budget = cat.budget;
      let progress = 0;
      let progressBarClass = "";
      if (budget > 0) {
        progress = Math.min((spent / budget) * 100, 100);
        if (progress > 80) {
          progressBarClass = "danger";
        } else if (progress > 50) {
          progressBarClass = "warning";
        } else {
          progressBarClass = "success";
        }
      } else {
        progressBarClass = "success";
      }
      return `
            <div>
                <div class="row center" style="justify-content:space-between">
                    <div class="subtitle">${cat.name}</div>
                    <div class="subtitle">${formatBRL(spent)} / ${formatBRL(
        budget
      )}</div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar ${progressBarClass}" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    })
    .join("");
  return `
      <div class="col" style="gap:8px">
          ${categoriesHTML}
      </div>
  `;
}

export function renderTransactions(root) {
  const d = State.data;
  const listHTML = d.tx
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(txItem)
    .join("");
  root.innerHTML = `
  <section class="card" style="margin-top:12px" aria-label="Extrato completo">
    <div class="row center" style="justify-content:space-between;">
      <div class="section-title">Extrato Completo</div>
      <div class="row center" style="gap:8px">
        <button class="btn tonal" onclick="exportCSV()" aria-label="Exportar CSV">Exportar CSV</button>
      </div>
    </div>
    <div id="txList" class="list" style="margin-top:8px">${
      listHTML || emptyState("Nenhuma movimentação para exibir.", "list_alt")
    }</div>
  </section>
  `;
}

export function renderAccounts(root) {
  const d = State.data;
  const accountListHTML = d.accounts
    .map(
      (acc) => `
      <div class="item">
          <div class="left">
              <div class="dot" style="background: var(--primary);"></div>
              <div>
                  <div class="title">${acc.name}</div>
                  <div class="subtitle">${formatBRL(acc.balance)}</div>
              </div>
          </div>
          <button class="btn ghost" onclick="uiEditAccount('${
            acc.id
          }')">Editar</button>
      </div>
  `
    )
    .join("");
  root.innerHTML = `
      <section class="card">
          <div class="row center" style="justify-content:space-between;">
              <div class="section-title">Suas Contas</div>
              <button class="btn" onclick="uiAddAccount()">Adicionar Conta</button>
          </div>
          <div class="list" style="margin-top:8px">${
            accountListHTML ||
            emptyState("Nenhuma conta cadastrada.", "account_balance_wallet")
          }</div>
      </section>
  `;
}

export function renderMetas(root) {
  const goalsHTML = State.data.goals
    .map((goal) => {
      const progress = Math.min((goal.saved / goal.target) * 100, 100);
      const remaining = goal.target - goal.saved;
      const remainingText =
        remaining > 0 ? `${formatBRL(remaining)} restantes` : "Concluída!";
      const deadline = new Date(goal.deadline).toLocaleDateString("pt-BR");
      return `
          <div class="item">
              <div class="left">
                  <div class="dot"></div>
                  <div>
                      <div class="title">${goal.name}</div>
                      <div class="subtitle">
                          ${formatBRL(goal.saved)} de ${formatBRL(
        goal.target
      )} • Prazo: ${deadline}
                      </div>
                      <div class="progress-bar-container" style="margin-top: 4px; width: 150px;">
                          <div class="progress-bar ${
                            progress === 100 ? "success" : ""
                          }" style="width: ${progress}%"></div>
                      </div>
                  </div>
              </div>
          </div>
      `;
    })
    .join("");
  root.innerHTML = `
      <section class="card">
          <div class="row center" style="justify-content:space-between;">
              <div class="section-title">Metas de Economia</div>
              <button class="btn" onclick="uiAddGoal()">Nova Meta</button>
          </div>
          <div class="list" style="margin-top:8px;">
              ${
                goalsHTML ||
                emptyState("Nenhuma meta de economia cadastrada.", "savings")
              }
          </div>
      </section>
  `;
}

export function renderRecurringTx(root) {
  const listHTML = State.data.recurringTx
    .map(
      (rtx) => `
        <div class="item">
            <div class="left">
                <div class="dot" style="background: var(--primary);"></div>
                <div>
                    <div class="title">${rtx.name}</div>
                    <div class="subtitle">${rtx.category} • ${
        rtx.frequency === "monthly" ? "Mensal" : "Semanal"
      } • Conta: ${
        State.data.accounts.find((acc) => acc.id === rtx.accountId)?.name ||
        "N/A"
      }</div>
                </div>
            </div>
            <div class="amount ${rtx.type === "crédito" ? "plus" : "minus"}">${
        rtx.type === "crédito" ? "+" : ""
      }${formatBRL(rtx.amount)}</div>
        </div>
    `
    )
    .join("");
  root.innerHTML = `
        <section class="card">
            <div class="row center" style="justify-content:space-between;">
                <div class="section-title">Transações Recorrentes</div>
                <button class="btn" onclick="uiAddRecurringTx()">Nova Recorrência</button>
            </div>
            <div class="list" style="margin-top:8px;">
                ${
                  listHTML ||
                  emptyState(
                    "Nenhuma transação recorrente cadastrada.",
                    "cached"
                  )
                }
            </div>
        </section>
    `;
}

export function renderCategories(root) {
  const d = State.data;
  const categoryListHTML = d.categories
    .map(
      (cat) => `
        <div class="item">
            <div class="left">
                <div class="dot" style="background: var(--primary);"></div>
                <div>
                    <div class="title">${cat.name}</div>
                    <div class="subtitle">Orçamento: ${formatBRL(
                      cat.budget
                    )}</div>
                </div>
            </div>
            <button class="btn ghost" onclick="uiEditCategory('${
              cat.name
            }')">Editar</button>
        </div>
    `
    )
    .join("");
  root.innerHTML = `
        <section class="card">
            <div class="row center" style="justify-content:space-between;">
                <div class="section-title">Categorias e Orçamentos</div>
                <button class="btn" onclick="uiAddCategory()">Adicionar categoria</button>
            </div>
            <div class="list" style="margin-top:8px">${
              categoryListHTML ||
              emptyState("Nenhuma categoria cadastrada.", "label")
            }</div>
        </section>
    `;
}

export function renderProfile(root) {
  const d = State.data;
  root.innerHTML = `
  <section class="card">
    <div class="section-title">Perfil</div>
    <div class="row wrap">
      <div class="field"><label>Nome</label><input id="name" class="input" value="${d.profile.name}" /></div>
      <div class="field"><label>E-mail</label><input id="email" class="input" value="${d.profile.email}" /></div>
    </div>
    <div class="row" style="margin-top:10px; gap:8px">
      <button class="btn" onclick="uiSaveProfile()">Salvar</button>
      <button class="btn ghost" onclick="State.reset(); State.save(); navigate(); toast('App resetado');">Resetar app</button>
    </div>
  </section>
  <section class="card" style="margin-top:12px">
    <div class="section-title">Preferências</div>
    <div class="row" style="gap:8px">
      <button class="btn" onclick="toggleTheme()">Alternar tema</button>
    </div>
    <details style="margin-top:10px">
      <summary>FAQ</summary>
      <p class="subtitle">Este é um protótipo educacional. Não insira dados pessoais.</p>
    </details>
  </section>
`;
}
