// =========================================================
// Arquivo: scripts/state.js
// Descrição: Gerenciamento de estado da aplicação.
// Exporta o objeto 'State' para que outros arquivos possam usá-lo.
// =========================================================
import { uid, daysAgo } from "./utils.js";

// Chave para o armazenamento local.
const StorageKey = "neowallet.v5";

// Objeto de estado global que armazena e gerencia todos os dados da aplicação.
export const State = {
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
