// =========================================================
// Arquivo: scripts/ui.js
// Descrição: Funções para interações da UI e modais.
// Exporta as funções para serem chamadas nos botões HTML.
// =========================================================
import { $, toast, uid } from "./utils.js";
import { State } from "./state.js";
import { navigate, setTheme } from "./router.js";

export function openModal(title, contentHTML, actionsHTML) {
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

export function closeModal() {
  const b = $("#modalBackdrop");
  b.style.display = "none";
  b.setAttribute("aria-hidden", "true");
  b.innerHTML = "";
  navigate();
}

export function uiAddAccount() {
  const title = "Nova Conta";
  const content = `
    <div class="field"><label>Nome da Conta</label><input id="accName" class="input" placeholder="Ex.: Conta Corrente" /></div>
    <div class="field"><label>Saldo Inicial</label><input id="accBalance" class="input" type="number" step="0.01" value="0" /></div>
  `;
  const actions = `
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
  `;
  openModal(title, content, actions);
}

export function uiEditAccount(accountId) {
  const account = State.data.accounts.find((acc) => acc.id === accountId);
  if (!account) return;
  const title = `Editar ${account.name}`;
  const content = `
    <div class="field"><label>Nome da Conta</label><input id="accName" class="input" value="${account.name}" /></div>
    <div class="field"><label>Novo Saldo</label><input id="accBalance" class="input" type="number" step="0.01" value="${account.balance}" /></div>
  `;
  const actions = `
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
        account.name = newName;
        account.balance = newBalance;
        State.data.balance = getTotalBalance();
        State.save();
        closeModal();
        toast('Conta atualizada');
    })()">Salvar</button>
  `;
  openModal(title, content, actions);
}

export function uiAddTx() {
  const categoryOptions = State.data.categories
    .map((cat) => `<option value="${cat.name}">${cat.name}</option>`)
    .join("");
  const accountOptions = State.data.accounts
    .map((acc) => `<option value="${acc.id}">${acc.name}</option>`)
    .join("");
  const title = "Adicionar movimentação";
  const content = `
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
  `;
  const actions = `
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
  `;
  openModal(title, content, actions);
}

export function uiAddCategory() {
  const title = "Nova Categoria";
  const content = `
    <div class="field"><label>Nome da Categoria</label><input id="catName" class="input" placeholder="Ex.: Lazer" /></div>
    <div class="field"><label>Orçamento Mensal (opcional)</label><input id="catBudget" class="input" type="number" step="0.01" placeholder="0.00" /></div>
  `;
  const actions = `
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
  `;
  openModal(title, content, actions);
}

export function uiEditCategory(catName) {
  const category = State.data.categories.find((c) => c.name === catName);
  const title = `Editar ${catName}`;
  const content = `
    <div class="field"><label>Novo Nome</label><input id="catName" class="input" value="${category.name}" /></div>
    <div class="field"><label>Novo Orçamento Mensal</label><input id="catBudget" class="input" type="number" step="0.01" value="${category.budget}" /></div>
  `;
  const actions = `
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
  `;
  openModal(title, content, actions);
}

export function uiAddGoal() {
  const title = "Nova Meta";
  const content = `
    <div class="field"><label>Nome da Meta</label><input id="goalName" class="input" placeholder="Ex.: Entrada para o carro" /></div>
    <div class="field"><label>Valor Total</label><input id="goalTarget" class="input" type="number" step="0.01" placeholder="0.00" /></div>
    <div class="field"><label>Valor Já Salvo</label><input id="goalSaved" class="input" type="number" step="0.01" value="0" /></div>
    <div class="field"><label>Prazo</label><input id="goalDeadline" class="input" type="date" /></div>
  `;
  const actions = `
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
  `;
  openModal(title, content, actions);
}

export function uiAddRecurringTx() {
  const categoryOptions = State.data.categories
    .map((cat) => `<option value="${cat.name}">${cat.name}</option>`)
    .join("");
  const accountOptions = State.data.accounts
    .map((acc) => `<option value="${acc.id}">${acc.name}</option>`)
    .join("");
  const title = "Nova Transação Recorrente";
  const content = `
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
  `;
  const actions = `
    <button class="btn ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn" onclick="(function(){
      const name=$('#rtxName').value.trim(); const type=$('#rtxType').value; const cat=$('#rtxCat').value||'Outros'; const v=parseFloat($('#rtxVal').value||'0'); const accountId = $('#rtxAccount').value; const freq = $('#rtxFreq').value;
      if(!name||isNaN(v)||v===0){ toast('Preencha os campos corretamente'); return; }
      State.data.recurringTx.push({ id: uid(), name, type, amount: v, category: cat, accountId, frequency: freq, lastAddedDate: new Date().toISOString() });
      State.save();
      closeModal();
      toast('Recorrência adicionada');
    })()">Adicionar</button>
  `;
  openModal(title, content, actions);
}

export function uiSaveProfile() {
  const n = $("#name").value || "Usuário";
  const e = $("#email").value || "user@example.com";
  State.data.profile.name = n;
  State.data.profile.email = e;
  State.save();
  toast("Perfil salvo");
  $("#greeting").textContent = `Olá, ${n}`;
}

export function toggleBalanceVisibility() {
  State.data.balanceVisible = !State.data.balanceVisible;
  State.save();
  navigate();
}

export function toggleTheme() {
  const t = State.data.theme === "light" ? "dark" : "light";
  State.data.theme = t;
  State.save();
  setTheme(t);
}
