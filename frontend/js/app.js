const STORAGE_KEY = "erp_financeiro_lancamentos_v2";

const BANCOS_INICIAIS = [
  { nome: "Itaú", saldoInicial: 12500.0, statusConta: "Conciliada" },
  { nome: "Bradesco", saldoInicial: 6400.0, statusConta: "Conciliada" },
  { nome: "Santander", saldoInicial: 3200.0, statusConta: "Pendência" },
  { nome: "Nubank Empresas", saldoInicial: 8900.0, statusConta: "Conciliada" },
  { nome: "BTG Pactual", saldoInicial: 15000.0, statusConta: "Reserva" }
];

const LANCAMENTOS_EXEMPLO = [
  { id: 1, descricao: "Contrato SaaS Cliente Alpha", tipo: "receber", banco: "Itaú", vencimento: "2026-11-25", valor: 4200.0, status: "pago" },
  { id: 2, descricao: "Cluster Cloud & Observabilidade", tipo: "pagar", banco: "Nubank Empresas", vencimento: "2026-11-25", valor: 950.0, status: "pendente" },
  { id: 3, descricao: "Licença Segurança Corporativa", tipo: "pagar", banco: "Santander", vencimento: "2026-11-18", valor: 1300.0, status: "atrasado" },
  { id: 4, descricao: "Consultoria Arquitetura Q4", tipo: "receber", banco: "BTG Pactual", vencimento: "2026-11-12", valor: 6500.0, status: "pago" },
  { id: 5, descricao: "Insumos Operacionais Filial SP", tipo: "pagar", banco: "Bradesco", vencimento: "2026-11-28", valor: 1180.0, status: "pendente" }
];

let lancamentos = carregarLancamentos();

function carregarLancamentos() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (salvo) return JSON.parse(salvo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(LANCAMENTOS_EXEMPLO));
  return [...LANCAMENTOS_EXEMPLO];
}

function salvarLancamentos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lancamentos));
}

function formatarBRL(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hojeISO() {
  const agora = new Date();
  const offset = agora.getTimezoneOffset() * 60000;
  return new Date(agora - offset).toISOString().slice(0, 10);
}

function calcularSaldoBanco(bancoObj) {
  const movimentacoesPagas = lancamentos
    .filter((l) => l.banco === bancoObj.nome && l.status === "pago")
    .reduce((acc, l) => (l.tipo === "receber" ? acc + l.valor : acc - l.valor), 0);

  return bancoObj.saldoInicial + movimentacoesPagas;
}

function verificarVencimentosAtrasados() {
  const hoje = hojeISO();
  let alterados = 0;

  lancamentos = lancamentos.map((item) => {
    if (item.status === "pendente" && item.vencimento < hoje) {
      alterados += 1;
      return { ...item, status: "atrasado" };
    }
    return item;
  });

  if (alterados > 0) {
    salvarLancamentos();
    renderTudo();
  }
  alert(
    alterados > 0
      ? `${alterados} lançamento(s) vencido(s) atualizado(s) para ATRASADO.`
      : "Nenhum título pendente vencido encontrado."
  );
}

function renderBancos() {
  const container = document.getElementById("lista-bancos");
  container.innerHTML = "";

  BANCOS_INICIAIS.forEach((banco) => {
    const saldoAtual = calcularSaldoBanco(banco);
    const abertosBanco = lancamentos.filter(
      (l) => l.banco === banco.nome && l.status !== "pago"
    );
    const atrasadosBanco = abertosBanco.filter((l) => l.status === "atrasado").length;

    const card = document.createElement("div");
    card.className = "banco-card";
    card.innerHTML = `
      <div class="banco-header">
        <span class="banco-nome">${banco.nome}</span>
        <span class="banco-pill ${atrasadosBanco > 0 ? "alerta" : ""}">
          ${atrasadosBanco > 0 ? `${atrasadosBanco} ATRASADO` : banco.statusConta}
        </span>
      </div>
      <div class="banco-saldo">${formatarBRL(saldoAtual)}</div>
      <div class="banco-status">${abertosBanco.length} lançamento(s) em aberto</div>
    `;
    container.appendChild(card);
  });
}

function renderKPIs() {
  const bancoFiltro = document.getElementById("filtro-banco").value;
  const visao = document.getElementById("visao-fluxo").value;
  document.getElementById("label-periodo").textContent = visao === "diario" ? "Diário" : "Mensal";

  const baseLancamentos =
    bancoFiltro === "todos"
      ? lancamentos
      : lancamentos.filter((l) => l.banco === bancoFiltro);

  const abertosReceber = baseLancamentos.filter((l) => l.tipo === "receber" && l.status !== "pago");
  const abertosPagar = baseLancamentos.filter((l) => l.tipo === "pagar" && l.status !== "pago");

  const totalReceber = abertosReceber.reduce((acc, l) => acc + l.valor, 0);
  const totalPagar = abertosPagar.reduce((acc, l) => acc + l.valor, 0);

  const bancosAlvo =
    bancoFiltro === "todos"
      ? BANCOS_INICIAIS
      : BANCOS_INICIAIS.filter((b) => b.nome === bancoFiltro);

  const saldoTotalBancos = bancosAlvo.reduce((acc, b) => acc + calcularSaldoBanco(b), 0);

  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);

  const pagosPeriodo = baseLancamentos.filter((l) => {
    if (l.status !== "pago") return false;
    return visao === "diario" ? l.vencimento === hoje : l.vencimento.startsWith(mesAtual);
  });

  const entradasPeriodo = pagosPeriodo
    .filter((l) => l.tipo === "receber")
    .reduce((acc, l) => acc + l.valor, 0);

  const saidasPeriodo = pagosPeriodo
    .filter((l) => l.tipo === "pagar")
    .reduce((acc, l) => acc + l.valor, 0);

  const fluxoPeriodo = entradasPeriodo - saidasPeriodo;

  document.getElementById("kpi-receber").textContent = formatarBRL(totalReceber);
  document.getElementById("meta-receber").textContent = `${abertosReceber.length} título(s) em aberto`;

  document.getElementById("kpi-pagar").textContent = formatarBRL(totalPagar);
  document.getElementById("meta-pagar").textContent = `${abertosPagar.length} título(s) em aberto`;

  document.getElementById("kpi-liquido").textContent = formatarBRL(saldoTotalBancos);

  const elFluxo = document.getElementById("kpi-fluxo");
  elFluxo.textContent = formatarBRL(fluxoPeriodo);
  elFluxo.className = fluxoPeriodo >= 0 ? "positivo" : "negativo";
  document.getElementById("meta-fluxo").textContent =
    `Entradas: ${formatarBRL(entradasPeriodo)} · Saídas: ${formatarBRL(saidasPeriodo)}`;
}

function alternarStatus(id) {
  const ordem = ["pendente", "pago", "atrasado"];
  lancamentos = lancamentos.map((item) => {
    if (item.id !== id) return item;
    const prox = ordem[(ordem.indexOf(item.status) + 1) % ordem.length];
    return { ...item, status: prox };
  });
  salvarLancamentos();
  renderTudo();
}

function excluirLancamento(id) {
  lancamentos = lancamentos.filter((item) => item.id !== id);
  salvarLancamentos();
  renderTudo();
}

function renderTabela() {
  const filtroStatus = document.getElementById("filtro-status").value;
  const filtroBanco = document.getElementById("filtro-banco").value;
  const tbody = document.getElementById("tabela-lancamentos");
  tbody.innerHTML = "";

  const filtrados = lancamentos.filter((l) => {
    const matchStatus = filtroStatus === "todos" || l.status === filtroStatus;
    const matchBanco = filtroBanco === "todos" || l.banco === filtroBanco;
    return matchStatus && matchBanco;
  });

  document.getElementById("contador-linhas").textContent = `${filtrados.length} registro(s)`;

  filtrados.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.descricao}</td>
      <td>${item.tipo === "receber" ? "A Receber" : "A Pagar"}</td>
      <td>${item.banco}</td>
      <td>${item.vencimento}</td>
      <td class="${item.tipo === "receber" ? "positivo" : "negativo"}">${formatarBRL(item.valor)}</td>
      <td><span class="badge badge-${item.status}">${item.status}</span></td>
      <td>
        <div class="acoes-cell">
          <button class="btn-acao" onclick="alternarStatus(${item.id})">Status</button>
          <button class="btn-excluir" onclick="excluirLancamento(${item.id})">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function exportarJSON() {
  const blob = new Blob([JSON.stringify({ bancos: BANCOS_INICIAIS, lancamentos }, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `erp-financeiro-${hojeISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetarDemo() {
  lancamentos = [...LANCAMENTOS_EXEMPLO];
  salvarLancamentos();
  renderTudo();
}

document.getElementById("form-lancamento").addEventListener("submit", (e) => {
  e.preventDefault();

  const novo = {
    id: Date.now(),
    descricao: document.getElementById("descricao").value.trim(),
    tipo: document.getElementById("tipo").value,
    banco: document.getElementById("banco").value,
    valor: parseFloat(document.getElementById("valor").value),
    vencimento: document.getElementById("vencimento").value,
    status: document.getElementById("status").value
  };

  lancamentos.unshift(novo);
  salvarLancamentos();
  e.target.reset();
  renderTudo();
});

document.getElementById("filtro-status").addEventListener("change", renderTabela);
document.getElementById("filtro-banco").addEventListener("change", () => {
  renderKPIs();
  renderTabela();
});
document.getElementById("visao-fluxo").addEventListener("change", renderKPIs);
document.getElementById("btn-verificar-atrasos").addEventListener("click", verificarVencimentosAtrasados);
document.getElementById("btn-exportar-json").addEventListener("click", exportarJSON);
document.getElementById("btn-resetar-dados").addEventListener("click", resetarDemo);

function renderTudo() {
  renderKPIs();
  renderBancos();
  renderTabela();
}

renderTudo();