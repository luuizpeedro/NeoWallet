// ============================
// NeoWallet — JS puro
// ============================
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const StorageKey = "neowallet.v5";
const State = {
  data: null,
  load() {
    try {
      const raw = localStorage.getItem(StorageKey);
      if (raw) {
        this.data = JSON.parse(raw);
      }
    } catch {}
    if (!this.data) this.data = this.seed();
  },
  save() {
    localStorage.setItem(StorageKey, JSON.stringify(this.data));
  },
  reset() {
    localStorage.removeItem(StorageKey);
    this.data = this.seed();
  },
  seed() {
    const mainAccountId = uid();
    return {
      theme: "light",
      balanceVisible: true,
      profile: { name: "Alex", email: "alex@example.com", lang: "pt-BR" },
      accounts: [
        { id: mainAccountId, name: "Conta Principal", balance: 1250.55 },
        { id: uid(), name: "Poupança", balance: 5000.0 },
      ],
      categories: [
        { name: "Moradia", budget: 800 },
        { name: "Alimentação", budget: 400 },
        { name: "Transporte", budget: 150 },
        { name: "Lazer", budget: 200 },
        { name: "Saúde", budget: 100 },
        { name: "Outros", budget: 0 },
      ],
      tx: [
        {
          id: uid(),
          date: daysAgo(1),
          type: "crédito",
          category: "Salário",
          desc: "Pagamento",
          amount: 2500.0,
          accountId: mainAccountId,
        },
        {
          id: uid(),
          date: daysAgo(0),
          type: "débito",
          category: "Alimentação",
          desc: "Compras no mercado",
          amount: -152.4,
          accountId: mainAccountId,
        },
        {
          id: uid(),
          date: daysAgo(0),
          type: "débito",
          category: "Transporte",
          desc: "App de corrida",
          amount: -28.9,
          accountId: mainAccountId,
        },
      ],
      recurringTx: [
        {
          id: uid(),
          name: "Aluguel",
          amount: 800,
          category: "Moradia",
          type: "débito",
          accountId: mainAccountId,
          frequency: "monthly",
          lastAddedDate: daysAgo(30),
        },
        {
          id: uid(),
          name: "Assinatura de streaming",
          amount: 29.9,
          category: "Lazer",
          type: "débito",
          accountId: mainAccountId,
          frequency: "monthly",
          lastAddedDate: daysAgo(15),
        },
      ],
      goals: [
        {
          id: uid(),
          name: "Reserva de Emergência",
          target: 10000,
          saved: 5000,
          deadline: "2026-12-31",
        },
        {
          id: uid(),
          name: "Viagem para a praia",
          target: 2500,
          saved: 500,
          deadline: "2026-06-30",
        },
      ],
    };
  },
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function formatBRL(v) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.style.display = "none"), 2200);
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  const icon = $("#themeToggle .material-symbols-outlined");
  icon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
}

function setActiveNav() {
  $$(".bottomnav a").forEach((a) => a.classList.remove("active"));
  const hash = location.hash.replace("#/", "") || "dashboard";
  const el = document.getElementById("nav-" + hash);
  if (el) el.classList.add("active");
}

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

// Router
const Routes = {
  dashboard: renderDashboard,
  relatorios: renderRelatorios,
  extrato: renderTransactions,
  metas: renderMetas,
  contas: renderAccounts,
  recorrentes: renderRecurringTx,
  perfil: renderProfile,
};

function navigate() {
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

// ---------- Modals ----------
function openModal(title, contentHTML, actionsHTML) {
  const b = $("#modalBackdrop");
  b.innerHTML = `
  <div class="modal" role="document">
    <div class="modal-header">
      <strong>${title}</strong>
      <button class="btn ghost" aria-label="Fechar" onclick="closeModal()">✕</button>
    </div>
    <div class="col">${contentHTML}</div>
    <div class="row" style="margin-top:12px; justify-content:flex-end; gap:8px">${
      actionsHTML || ""
    }</div>
  </div>`;
  b.style.display = "flex";
  b.setAttribute("aria-hidden", "false");
  b.addEventListener("click", (e) => {
    if (e.target === b) closeModal();
  });
  const first = b.querySelector("input,select,textarea,button");
  if (first) first.focus();
}
function closeModal() {
  const b = $("#modalBackdrop");
  b.style.display = "none";
  b.setAttribute("aria-hidden", "true");
  b.innerHTML = "";
  navigate();
}

// ---------- CSV ----------
function exportCSV() {
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

// ---------- Screens ----------
function renderDashboard(root) {
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

function checkAlerts() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let alerts = [];

  // Checar orçamentos
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

  // Checar metas
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

function renderRelatorios(root) {
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
          }" font-size="10" fill="var(--muted)">${formatBRL(minBalance)}</text>
          <text x="0" y="${
            yScale(maxBalance) + 5
          }" font-size="10" fill="var(--muted)">${formatBRL(maxBalance)}</text>
        </g>
      </svg>
    `;
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

function txItem(t) {
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

function renderTransactions(root) {
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

function renderAccounts(root) {
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

function renderMetas(root) {
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

function renderRecurringTx(root) {
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

function renderCategories(root) {
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

function renderProfile(root) {
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
      <p class="subtitle">Este é um protótipo educacional. Não insira dados reais.</p>
    </details>
  </section>
`;
}

// ---------- UI Actions ----------
function uiAddAccount() {
  openModal(
    "Nova Conta",
    `
      <div class="field"><label>Nome da Conta</label><input id="accName" class="input" placeholder="Ex.: Conta Corrente" /></div>
      <div class="field"><label>Saldo Inicial</label><input id="accBalance" class="input" type="number" step="0.01" value="0" /></div>
    `,
    `
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn" onclick="(function(){
          const name = $('#accName').value.trim();
          const balance = parseFloat($('#accBalance').value) || 0;
          if (!name) { toast('Nome inválido'); return; }
          if (State.data.accounts.find(c => c.name === name)) { toast('Conta já existe'); return; }
          State.data.accounts.push({ id: uid(), name, balance });
          State.save();
          closeModal();
          toast('Conta adicionada');
      })()">Salvar</button>
    `
  );
}

function uiEditAccount(accountId) {
  const account = State.data.accounts.find((acc) => acc.id === accountId);
  if (!account) return;

  openModal(
    `Editar ${account.name}`,
    `
      <div class="field"><label>Nome da Conta</label><input id="accName" class="input" value="${account.name}" /></div>
      <div class="field"><label>Novo Saldo</label><input id="accBalance" class="input" type="number" step="0.01" value="${account.balance}" /></div>
    `,
    `
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn danger" onclick="(function(){
          if(State.data.accounts.length > 1 && confirm('Tem certeza que deseja excluir esta conta? As transações relacionadas não serão removidas.')) {
              State.data.accounts = State.data.accounts.filter(acc => acc.id !== '${accountId}');
              State.save();
              closeModal();
              toast('Conta excluída');
          } else if(State.data.accounts.length <= 1) {
              toast('Não é possível excluir a única conta.');
          }
      })()">Excluir</button>
      <button class="btn" onclick="(function(){
          const newName = $('#accName').value.trim();
          const newBalance = parseFloat($('#accBalance').value) || 0;
          if (!newName) { toast('Nome inválido'); return; }
          const oldBalance = account.balance;
          
          account.name = newName;
          account.balance = newBalance;
          
          State.data.balance = getTotalBalance();
          State.save();
          closeModal();
          toast('Conta atualizada');
      })()">Salvar</button>
    `
  );
}

function uiAddTx() {
  const categoryOptions = State.data.categories
    .map((cat) => `<option value="${cat.name}">${cat.name}</option>`)
    .join("");
  const accountOptions = State.data.accounts
    .map((acc) => `<option value="${acc.id}">${acc.name}</option>`)
    .join("");
  openModal(
    "Adicionar movimentação",
    `
  <div class="row wrap">
    <div class="field" style="flex:1; min-width:140px">
      <label>Tipo</label>
      <select id="txType" class="input"><option value="crédito">Receita</option><option value="débito">Despesa</option></select>
    </div>
    <div class="field" style="flex:1; min-width:160px">
      <label>Categoria</label>
      <select id="txCat" class="input">${categoryOptions}</select>
    </div>
  </div>
  <div class="field"><label>Descrição</label><input id="txDesc" class="input" placeholder="Ex.: Compras" /></div>
  <div class="row wrap">
    <div class="field" style="flex:1; min-width:140px">
      <label>Valor</label>
      <input id="txVal" class="input" type="number" step="0.01" />
    </div>
    <div class="field" style="flex:1; min-width:180px">
      <label>Conta</label>
      <select id="txAccount" class="input">${accountOptions}</select>
    </div>
  </div>
  <div class="field"><label>Data</label><input id="txDate" class="input" type="date" value="${new Date()
    .toISOString()
    .slice(0, 10)}" /></div>
`,
    `
  <button class="btn ghost" onclick="closeModal()">Cancelar</button>
  <button class="btn" onclick="(function(){
    const type=$('#txType').value; const cat=$('#txCat').value||'Outros'; const desc=$('#txDesc').value||''; const v=parseFloat($('#txVal').value||'0'); const dt=$('#txDate').value||new Date().toISOString().slice(0,10); const accountId = $('#txAccount').value;
    if(isNaN(v)||v===0){ toast('Informe um valor válido'); return; }
    const amount = type==='crédito'? Math.abs(v) : -Math.abs(v);
    
    const account = State.data.accounts.find(acc => acc.id === accountId);
    if (account) {
      account.balance += amount;
    }

    State.data.tx.push({ id: uid(), date: new Date(dt).toISOString(), type, category: cat, desc, amount, accountId });
    State.save(); 
    closeModal(); 
    toast('Movimentação adicionada');
  })()">Adicionar</button>
`
  );
}

function uiAddCategory() {
  openModal(
    "Nova Categoria",
    `
            <div class="field"><label>Nome da Categoria</label><input id="catName" class="input" placeholder="Ex.: Lazer" /></div>
            <div class="field"><label>Orçamento Mensal (opcional)</label><input id="catBudget" class="input" type="number" step="0.01" placeholder="0.00" /></div>
        `,
    `
            <button class="btn ghost" onclick="closeModal()">Cancelar</button>
            <button class="btn" onclick="(function(){
                const name = $('#catName').value.trim();
                const budget = parseFloat($('#catBudget').value) || 0;
                if (!name) { toast('Nome inválido'); return; }
                if (State.data.categories.find(c => c.name === name)) { toast('Categoria já existe'); return; }
                State.data.categories.push({ name, budget });
                State.save();
                closeModal();
                toast('Categoria adicionada');
            })()">Salvar</button>
        `
  );
}

function uiEditCategory(catName) {
  const category = State.data.categories.find((c) => c.name === catName);
  openModal(
    `Editar ${catName}`,
    `
            <div class="field"><label>Novo Nome</label><input id="catName" class="input" value="${category.name}" /></div>
            <div class="field"><label>Novo Orçamento Mensal</label><input id="catBudget" class="input" type="number" step="0.01" value="${category.budget}" /></div>
        `,
    `
            <button class="btn ghost" onclick="closeModal()">Cancelar</button>
            <button class="btn danger" onclick="(function(){
                if (confirm('Tem certeza que deseja excluir esta categoria? As transações existentes não serão alteradas.')) {
                    State.data.categories = State.data.categories.filter(c => c.name !== '${catName}');
                    State.save();
                    closeModal();
                    toast('Categoria excluída');
                }
            })()">Excluir</button>
            <button class="btn" onclick="(function(){
                const name = $('#catName').value.trim();
                const budget = parseFloat($('#catBudget').value) || 0;
                if (!name) { toast('Nome inválido'); return; }
                category.name = name;
                category.budget = budget;
                State.save();
                closeModal();
                toast('Categoria atualizada');
            })()">Salvar</button>
        `
  );
}

function uiAddGoal() {
  openModal(
    "Nova Meta",
    `
            <div class="field"><label>Nome da Meta</label><input id="goalName" class="input" placeholder="Ex.: Entrada para o carro" /></div>
            <div class="field"><label>Valor Total</label><input id="goalTarget" class="input" type="number" step="0.01" placeholder="0.00" /></div>
            <div class="field"><label>Valor Já Salvo</label><input id="goalSaved" class="input" type="number" step="0.01" value="0" /></div>
            <div class="field"><label>Prazo</label><input id="goalDeadline" class="input" type="date" /></div>
        `,
    `
            <button class="btn ghost" onclick="closeModal()">Cancelar</button>
            <button class="btn" onclick="(function(){
                const name = $('#goalName').value.trim();
                const target = parseFloat($('#goalTarget').value) || 0;
                const saved = parseFloat($('#goalSaved').value) || 0;
                const deadline = $('#goalDeadline').value;
                if (!name || target <= 0 || !deadline) { toast('Preencha todos os campos corretamente'); return; }
                State.data.goals.push({ id: uid(), name, target, saved, deadline });
                State.save();
                closeModal();
                toast('Meta adicionada');
            })()">Salvar</button>
        `
  );
}

function uiAddRecurringTx() {
  const categoryOptions = State.data.categories
    .map((cat) => `<option value="${cat.name}">${cat.name}</option>`)
    .join("");
  const accountOptions = State.data.accounts
    .map((acc) => `<option value="${acc.id}">${acc.name}</option>`)
    .join("");
  openModal(
    "Nova Transação Recorrente",
    `
  <div class="field"><label>Nome</label><input id="rtxName" class="input" placeholder="Ex.: Aluguel" /></div>
  <div class="row wrap">
    <div class="field" style="flex:1; min-width:140px">
      <label>Tipo</label>
      <select id="rtxType" class="input"><option value="crédito">Receita</option><option value="débito">Despesa</option></select>
    </div>
    <div class="field" style="flex:1; min-width:160px">
      <label>Categoria</label>
      <select id="rtxCat" class="input">${categoryOptions}</select>
    </div>
  </div>
  <div class="row wrap">
    <div class="field" style="flex:1; min-width:140px">
      <label>Valor</label>
      <input id="rtxVal" class="input" type="number" step="0.01" />
    </div>
    <div class="field" style="flex:1; min-width:180px">
      <label>Conta</label>
      <select id="rtxAccount" class="input">${accountOptions}</select>
    </div>
  </div>
  <div class="field">
      <label>Frequência</label>
      <select id="rtxFreq" class="input">
          <option value="monthly">Mensal</option>
          <option value="weekly">Semanal</option>
      </select>
  </div>
`,
    `
  <button class="btn ghost" onclick="closeModal()">Cancelar</button>
  <button class="btn" onclick="(function(){
    const name=$('#rtxName').value.trim(); const type=$('#rtxType').value; const cat=$('#rtxCat').value||'Outros'; const v=parseFloat($('#rtxVal').value||'0'); const accountId = $('#rtxAccount').value; const freq = $('#rtxFreq').value;
    if(!name||isNaN(v)||v===0){ toast('Preencha os campos corretamente'); return; }
    
    State.data.recurringTx.push({ id: uid(), name, type, amount: v, category: cat, accountId, frequency: freq, lastAddedDate: new Date().toISOString() });
    State.save(); 
    closeModal(); 
    toast('Recorrência adicionada');
  })()">Adicionar</button>
`
  );
}

function uiSaveProfile() {
  const n = $("#name").value || "Usuário";
  const e = $("#email").value || "user@example.com";
  State.data.profile.name = n;
  State.data.profile.email = e;
  State.save();
  toast("Perfil salvo");
  $("#greeting").textContent = `Olá, ${n}`;
}

function toggleTheme() {
  const t = State.data.theme === "light" ? "dark" : "light";
  State.data.theme = t;
  State.save();
  setTheme(t);
}

function toggleBalanceVisibility() {
  State.data.balanceVisible = !State.data.balanceVisible;
  State.save();
  navigate();
}

function emptyState(message, icon) {
  return `
      <div class="empty-state">
          <span class="material-symbols-outlined" style="font-size: 4rem;">${icon}</span>
          <p class="subtitle">${message}</p>
      </div>
  `;
}

// ---------- Helpers ----------
function copyText(txt) {
  navigator.clipboard.writeText(txt);
  toast("Copiado para a área de transferência");
}

function genRandomKey() {
  const s = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((v) => ("0" + (v % 36).toString(36)).slice(-1))
    .join("");
  return s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8, 12);
}

function fakeQR(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  const size = 21;
  const cell = 8;
  const pad = 8;
  let rects = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inFinder =
        (x < 7 && y < 7) || (x > size - 8 && y < 7) || (x < 7 && y > size - 8);
      let on = inFinder
        ? x === 0 ||
          x === 6 ||
          y === 0 ||
          y === 6 ||
          (x > 1 && x < 5 && y > 1 && y < 5)
        : (h >> (x * y + y) % 31) & 1;
      if (on) {
        rects += `<rect x="${pad + x * cell}" y="${
          pad + y * cell
        }" width="${cell}" height="${cell}" rx="1" ry="1"></rect>`;
      }
    }
  }
  const dim = pad * 2 + size * cell;
  return `<svg width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" role="img" aria-label="QR ilustrativo"><rect width="100%" height="100%" fill="#fff" rx="12"/><g fill="#000">${rects}</g></svg>`;
}

// ---------- Init ----------
State.load();
setTheme(State.data.theme || "light");
$("#themeToggle").addEventListener("click", toggleTheme);

if (!location.hash) location.hash = "#/dashboard";
window.addEventListener("hashchange", navigate);
navigate();
