const API_BASE_URL = window.ERP_API_URL || "http://127.0.0.1:8000";

const BANCO_PARA_CONTA_ID = {
  "Itaú": 1,
  "Bradesco": 2,
  "Santander": 3,
  "Nubank Empresas": 4,
  "BTG Pactual": 5,
};

const FALLBACK_CONTAS = [
  {
    id_conta: 1,
    banco: "Itaú",
    apelido_conta: "Conta Principal",
    tipo_conta: "corrente",
    status_conta: "conciliada",
    saldo_inicial: 12500.0,
    variacao_liquidada: 4200.0,
    saldo_atual: 16700.0,
    qtd_em_aberto: 0,
    qtd_atrasados: 0,
  },
  {
    id_conta: 2,
    banco: "Bradesco",
    apelido_conta: "Operacional Filial",
    tipo_conta: "corrente",
    status_conta: "conciliada",
    saldo_inicial: 6400.0,
    variacao_liquidada: 0.0,
    saldo_atual: 6400.0,
    qtd_em_aberto: 1,
    qtd_atrasados: 0,
  },
  {
    id_conta: 3,
    banco: "Santander",
    apelido_conta: "Cobrança / Boleta",
    tipo_conta: "corrente",
    status_conta: "pendencia",
    saldo_inicial: 3200.0,
    variacao_liquidada: 0.0,
    saldo_atual: 3200.0,
    qtd_em_aberto: 1,
    qtd_atrasados: 1,
  },
  {
    id_conta: 4,
    banco: "Nubank Empresas",
    apelido_conta: "Pagamentos Cloud",
    tipo_conta: "pagamento",
    status_conta: "conciliada",
    saldo_inicial: 8900.0,
    variacao_liquidada: 0.0,
    saldo_atual: 8900.0,
    qtd_em_aberto: 1,
    qtd_atrasados: 0,
  },
  {
    id_conta: 5,
    banco: "BTG Pactual",
    apelido_conta: "Caixa / Reserva",
    tipo_conta: "reserva",
    status_conta: "reserva",
    saldo_inicial: 15000.0,
    variacao_liquidada: 6500.0,
    saldo_atual: 21500.0,
    qtd_em_aberto: 0,
    qtd_atrasados: 0,
  },
];

const FALLBACK_LANCAMENTOS = [
  {
    id_lancamento: 1,
    id_conta: 1,
    banco: "Itaú",
    apelido_conta: "Conta Principal",
    id_categoria: 1,
    categoria: "Assinaturas & Serviços",
    descricao: "Contrato SaaS Cliente Alpha",
    tipo: "receber",
    valor: 4200.0,
    data_vencimento: "2026-11-25",
    data_pagamento: "2026-11-25",
    status: "pago",
  },
  {
    id_lancamento: 2,
    id_conta: 4,
    banco: "Nubank Empresas",
    apelido_conta: "Pagamentos Cloud",
    id_categoria: 3,
    categoria: "Infraestrutura & Cloud",
    descricao: "Cluster Cloud & Observabilidade",
    tipo: "pagar",
    valor: 950.0,
    data_vencimento: "2026-11-25",
    data_pagamento: null,
    status: "pendente",
  },
  {
    id_lancamento: 3,
    id_conta: 3,
    banco: "Santander",
    apelido_conta: "Cobrança / Boleta",
    id_categoria: 4,
    categoria: "Licenças & Segurança",
    descricao: "Licença Segurança Corporativa",
    tipo: "pagar",
    valor: 1300.0,
    data_vencimento: "2026-11-18",
    data_pagamento: null,
    status: "atrasado",
  },
  {
    id_lancamento: 4,
    id_conta: 5,
    banco: "BTG Pactual",
    apelido_conta: "Caixa / Reserva",
    id_categoria: 2,
    categoria: "Consultoria & Projetos",
    descricao: "Consultoria Arquitetura Q4",
    tipo: "receber",
    valor: 6500.0,
    data_vencimento: "2026-11-12",
    data_pagamento: "2026-11-12",
    status: "pago",
  },
  {
    id_lancamento: 5,
    id_conta: 2,
    banco: "Bradesco",
    apelido_conta: "Operacional Filial",
    id_categoria: 5,
    categoria: "Operação & Suprimentos",
    descricao: "Insumos Operacionais Filial SP",
    tipo: "pagar",
    valor: 1180.0,
    data_vencimento: "2026-11-28",
    data_pagamento: null,
    status: "pendente",
  },
];

const state = {
  apiOnline: false,
  periodoFluxo: "diario",
  filtroStatus: "todos",
  filtroBanco: "todos",
  contas: structuredClone(FALLBACK_CONTAS),
  lancamentos: structuredClone(FALLBACK_LANCAMENTOS),
  fluxo: {
    total_entradas: 4200.0,
    total_saidas: 0.0,
    saldo_liquido: 4200.0,
  },
};

function formatarMoeda(valor) {
  const num = Number(valor || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(num);
}

function formatarData(isoDate) {
  if (!isoDate) return "—";
  const [ano, mes, dia] = String(isoDate).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return isoDate;
  return `${dia}/${mes}/${ano}`;
}

function calcularFluxoFallback(periodo) {
  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);

  const pagos = state.lancamentos.filter((item) => {
    if (item.status !== "pago") return false;
    const ref = item.data_pagamento || item.data_vencimento || "";
    return periodo === "diario" ? ref === hoje : ref.startsWith(mesAtual);
  });

  const entradas = pagos
    .filter((i) => i.tipo === "receber")
    .reduce((acc, i) => acc + Number(i.valor || 0), 0);
  const saidas = pagos
    .filter((i) => i.tipo === "pagar")
    .reduce((acc, i) => acc + Number(i.valor || 0), 0);

  return {
    total_entradas: entradas,
    total_saidas: saidas,
    saldo_liquido: entradas - saidas,
  };
}

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function carregarDados() {
  try {
    await apiRequest("/health");
    const [contas, lancamentos, fluxo] = await Promise.all([
      apiRequest("/contas"),
      apiRequest("/lancamentos"),
      apiRequest(`/fluxo-caixa?periodo=${encodeURIComponent(state.periodoFluxo)}`),
    ]);

    state.apiOnline = true;
    state.contas = Array.isArray(contas) ? contas : structuredClone(FALLBACK_CONTAS);
    state.lancamentos = Array.isArray(lancamentos)
      ? lancamentos
      : structuredClone(FALLBACK_LANCAMENTOS);
    state.fluxo = fluxo || calcularFluxoFallback(state.periodoFluxo);
  } catch (err) {
    console.warn("API indisponível ou com erro, usando dados locais:", err.message);
    state.apiOnline = false;
    state.contas = structuredClone(FALLBACK_CONTAS);
    state.lancamentos = structuredClone(FALLBACK_LANCAMENTOS);
    state.fluxo = calcularFluxoFallback(state.periodoFluxo);
  }

  renderizarTudo();
}

function getLancamentosFiltrados() {
  return state.lancamentos.filter((item) => {
    const matchStatus =
      state.filtroStatus === "todos" || !state.filtroStatus || item.status === state.filtroStatus;
    const matchBanco =
      state.filtroBanco === "todos" || !state.filtroBanco || String(item.banco) === state.filtroBanco;
    return matchStatus && matchBanco;
  });
}

function renderizarKpis(filtrados) {
  const receberAberto = filtrados.filter((l) => l.tipo === "receber" && l.status !== "pago");
  const pagarAberto = filtrados.filter((l) => l.tipo === "pagar" && l.status !== "pago");

  const totalReceber = receberAberto.reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const totalPagar = pagarAberto.reduce((acc, l) => acc + Number(l.valor || 0), 0);

  const contasFiltradas =
    state.filtroBanco === "todos" || !state.filtroBanco
      ? state.contas
      : state.contas.filter((c) => String(c.banco) === state.filtroBanco);

  const saldoConsolidado = contasFiltradas.reduce(
    (acc, c) => acc + Number(c.saldo_atual || 0),
    0
  );

  const elReceber = document.querySelector("#kpi-receber");
  const elMetaReceber = document.querySelector("#meta-receber");
  const elPagar = document.querySelector("#kpi-pagar");
  const elMetaPagar = document.querySelector("#meta-pagar");
  const elLiquido = document.querySelector("#kpi-liquido");
  const elFluxo = document.querySelector("#kpi-fluxo");
  const elLabelPeriodo = document.querySelector("#label-periodo");

  if (elReceber) elReceber.textContent = formatarMoeda(totalReceber);
  if (elMetaReceber) {
    elMetaReceber.textContent = `${receberAberto.length} títulos pendentes/atrasados`;
  }
  if (elPagar) elPagar.textContent = formatarMoeda(totalPagar);
  if (elMetaPagar) {
    elMetaPagar.textContent = `${pagarAberto.length} títulos pendentes/atrasados`;
  }
  if (elLiquido) elLiquido.textContent = formatarMoeda(saldoConsolidado);
  if (elFluxo) elFluxo.textContent = formatarMoeda(state.fluxo.saldo_liquido);
  if (elLabelPeriodo) {
    elLabelPeriodo.textContent = state.periodoFluxo === "mensal" ? "Mensal" : "Diário";
  }
}

function renderizarBancos() {
  const container = document.querySelector("#lista-bancos");
  if (!container) return;

  const contasExibidas =
    state.filtroBanco === "todos" || !state.filtroBanco
      ? state.contas
      : state.contas.filter((c) => String(c.banco) === state.filtroBanco);

  container.innerHTML = contasExibidas
    .map(
      (c) => `
      <article class="conta-card" data-conta-id="${c.id_conta}">
        <div class="conta-head">
          <strong>${c.banco}</strong>
          <span class="badge">${c.apelido_conta || c.tipo_conta}</span>
        </div>
        <div class="conta-saldo">${formatarMoeda(c.saldo_atual)}</div>
        <div class="conta-meta">
          <span>Inicial: ${formatarMoeda(c.saldo_inicial)}</span>
          <span>Aberto: ${c.qtd_em_aberto ?? 0}</span>
          <span>Atrasados: ${c.qtd_atrasados ?? 0}</span>
        </div>
      </article>
    `
    )
    .join("");
}

function renderizarTabela(filtrados) {
  const tbody = document.querySelector("#tabela-lancamentos");
  const contador = document.querySelector("#contador-linhas");

  if (contador) {
    contador.textContent = `${filtrados.length} ${filtrados.length === 1 ? "registro" : "registros"}`;
  }
  if (!tbody) return;

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Nenhum lançamento encontrado para os filtros atuais.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados
    .map((item) => {
      const tipoLabel = item.tipo === "receber" ? "A Receber" : "A Pagar";
      const sinal = item.tipo === "receber" ? "+" : "-";
      const botaoPagar =
        item.status !== "pago"
          ? `<button type="button" class="btn-outline btn-sm" data-pagar-id="${item.id_lancamento}">Marcar Pago</button>`
          : `<span class="meta-pago">Pago (${formatarData(item.data_pagamento)})</span>`;

      return `
        <tr>
          <td>${item.descricao}</td>
          <td>${tipoLabel}</td>
          <td>${item.banco}</td>
          <td>${formatarData(item.data_vencimento)}</td>
          <td class="${item.tipo === "receber" ? "positivo" : "negativo"}">${sinal} ${formatarMoeda(item.valor)}</td>
          <td><span class="status-${item.status}">${item.status}</span></td>
          <td>${botaoPagar}</td>
        </tr>
      `;
    })
    .join("");
}

function renderizarTudo() {
  const filtrados = getLancamentosFiltrados();
  renderizarKpis(filtrados);
  renderizarBancos();
  renderizarTabela(filtrados);
}

async function criarLancamento(event) {
  event.preventDefault();

  const descricao = String(document.querySelector("#descricao")?.value || "").trim();
  const tipo = String(document.querySelector("#tipo")?.value || "receber");
  const banco = String(document.querySelector("#banco")?.value || "Itaú");
  const valor = Number(document.querySelector("#valor")?.value || 0);
  const dataVencimento = String(document.querySelector("#vencimento")?.value || "");
  const status = String(document.querySelector("#status")?.value || "pendente");

  if (!descricao || valor <= 0 || !dataVencimento) return;

  const idConta = BANCO_PARA_CONTA_ID[banco] || 1;
  const payload = {
    id_conta: idConta,
    id_categoria: null,
    descricao,
    tipo,
    valor,
    data_vencimento: dataVencimento,
    status,
  };

  try {
    if (state.apiOnline) {
      await apiRequest("/lancamentos", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await carregarDados();
    } else {
      const conta = state.contas.find((c) => Number(c.id_conta) === idConta);
      const novoId =
        Math.max(0, ...state.lancamentos.map((l) => Number(l.id_lancamento || 0))) + 1;

      state.lancamentos.unshift({
        id_lancamento: novoId,
        id_conta: idConta,
        banco: conta ? conta.banco : banco,
        apelido_conta: conta ? conta.apelido_conta : "",
        categoria: "Geral",
        data_pagamento: status === "pago" ? new Date().toISOString().slice(0, 10) : null,
        ...payload,
      });

      if (status === "pago" && conta) {
        const delta = tipo === "receber" ? valor : -valor;
        conta.saldo_atual = Number(conta.saldo_atual || 0) + delta;
      }

      state.fluxo = calcularFluxoFallback(state.periodoFluxo);
      renderizarTudo();
    }

    document.querySelector("#form-lancamento")?.reset();
  } catch (err) {
    console.error("Erro ao adicionar lançamento:", err);
  }
}

async function liquidarLancamento(idLancamento) {
  try {
    if (state.apiOnline) {
      await apiRequest(`/lancamentos/${idLancamento}/pagar`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await carregarDados();
      return;
    }

    const item = state.lancamentos.find(
      (l) => Number(l.id_lancamento) === Number(idLancamento)
    );
    if (!item || item.status === "pago") return;

    item.status = "pago";
    item.data_pagamento = new Date().toISOString().slice(0, 10);

    const conta = state.contas.find((c) => Number(c.id_conta) === Number(item.id_conta));
    if (conta) {
      const delta = item.tipo === "receber" ? Number(item.valor) : -Number(item.valor);
      conta.saldo_atual = Number(conta.saldo_atual || 0) + delta;
    }

    state.fluxo = calcularFluxoFallback(state.periodoFluxo);
    renderizarTudo();
  } catch (err) {
    console.error("Erro ao liquidar lançamento:", err);
  }
}

function checarVencimentos() {
  const hoje = new Date().toISOString().slice(0, 10);
  let alterados = 0;

  state.lancamentos.forEach((item) => {
    if (item.status === "pendente" && item.data_vencimento && item.data_vencimento < hoje) {
      item.status = "atrasado";
      alterados += 1;
    }
  });

  renderizarTudo();
  console.info(`Verificação de vencimentos concluída: ${alterados} título(s) marcado(s) como atrasado.`);
}

function exportarJson() {
  const dados = {
    exportado_em: new Date().toISOString(),
    periodo_fluxo: state.periodoFluxo,
    contas: state.contas,
    lancamentos: getLancamentosFiltrados(),
    fluxo: state.fluxo,
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sysfin-erp-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function resetarDemo() {
  state.filtroBanco = "todos";
  state.filtroStatus = "todos";
  state.periodoFluxo = "diario";

  const elBanco = document.querySelector("#filtro-banco");
  const elStatus = document.querySelector("#filtro-status");
  const elVisao = document.querySelector("#visao-fluxo");
  if (elBanco) elBanco.value = "todos";
  if (elStatus) elStatus.value = "todos";
  if (elVisao) elVisao.value = "diario";

  await carregarDados();
}

function vincularEventos() {
  document.querySelector("#form-lancamento")?.addEventListener("submit", criarLancamento);

  document.querySelector("#filtro-banco")?.addEventListener("change", (e) => {
    state.filtroBanco = e.target.value;
    renderizarTudo();
  });

  document.querySelector("#filtro-status")?.addEventListener("change", (e) => {
    state.filtroStatus = e.target.value;
    renderizarTudo();
  });

  document.querySelector("#visao-fluxo")?.addEventListener("change", async (e) => {
    state.periodoFluxo = e.target.value === "mensal" ? "mensal" : "diario";
    await carregarDados();
  });

  document.querySelector("#btn-verificar-atrasos")?.addEventListener("click", checarVencimentos);
  document.querySelector("#btn-exportar-json")?.addEventListener("click", exportarJson);
  document.querySelector("#btn-resetar-dados")?.addEventListener("click", resetarDemo);

  document.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-pagar-id]");
    if (!btn) return;
    await liquidarLancamento(btn.dataset.pagarId);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  vincularEventos();
  carregarDados();
});