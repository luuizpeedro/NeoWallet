document.addEventListener("DOMContentLoaded", () => {
  const balanceValueEl = document.querySelector(".balance-value");
  const transactionListEl = document.getElementById("transaction-list");
  const editBtn = document.getElementById("edit-balance-btn");

  let accountBalance = 1356.98;

  const transactions = [
    { description: "Supermercado", amount: -150.75 },
    { description: "Salário", amount: 3500.0 },
    { description: "Uber", amount: -25.5 },
    { description: "Farmácia", amount: -54.9 },
  ];

  function updateBalanceDisplay() {
    balanceValueEl.innerText = `R$ ${accountBalance
      .toFixed(2)
      .replace(".", ",")}`;
  }

  function renderTransactions() {
    transactionListEl.innerHTML = "";
    transactions.forEach((transaction) => {
      const transactionItem = document.createElement("div");
      transactionItem.classList.add("transaction-item");

      const amountClass = transaction.amount < 0 ? "negative" : "";
      const sign = transaction.amount < 0 ? "" : "+";

      transactionItem.innerHTML = `
              <div class="transaction-info">
                  <p class="transaction-title">${transaction.description}</p>
              </div>
              <p class="transaction-amount ${amountClass}">${sign}R$ ${Math.abs(
        transaction.amount
      )
        .toFixed(2)
        .replace(".", ",")}</p>
          `;
      transactionListEl.appendChild(transactionItem);
    });
  }

  editBtn.addEventListener("click", () => {
    const newBalanceStr = prompt("Digite o novo valor do saldo:");
    if (
      newBalanceStr !== null &&
      !isNaN(newBalanceStr) &&
      newBalanceStr.trim() !== ""
    ) {
      accountBalance = parseFloat(newBalanceStr);
      updateBalanceDisplay();
      alert("Saldo atualizado com sucesso!");
    } else {
      alert("Valor inválido. Por favor, digite um número.");
    }
  });

  updateBalanceDisplay();
  renderTransactions();
});
