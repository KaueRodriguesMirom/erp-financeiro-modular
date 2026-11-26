CREATE TABLE IF NOT EXISTS bancos (
    id_banco        BIGSERIAL PRIMARY KEY,
    codigo_ispb     VARCHAR(8) UNIQUE,
    nome            VARCHAR(100) NOT NULL UNIQUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contas_bancarias (
    id_conta        BIGSERIAL PRIMARY KEY,
    id_banco        BIGINT NOT NULL REFERENCES bancos(id_banco) ON DELETE RESTRICT,
    apelido_conta   VARCHAR(80) NOT NULL,
    tipo_conta      VARCHAR(30) NOT NULL CHECK (tipo_conta IN ('corrente', 'pagamento', 'reserva')),
    saldo_inicial   NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status_conta    VARCHAR(30) NOT NULL DEFAULT 'conciliada'
                    CHECK (status_conta IN ('conciliada', 'pendencia', 'reserva', 'bloqueada')),
    ativa           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id_banco, apelido_conta)
);

CREATE TABLE IF NOT EXISTS categorias_financeiras (
    id_categoria    BIGSERIAL PRIMARY KEY,
    nome            VARCHAR(80) NOT NULL UNIQUE,
    natureza        VARCHAR(10) NOT NULL CHECK (natureza IN ('receber', 'pagar'))
);

CREATE TABLE IF NOT EXISTS lancamentos (
    id_lancamento   BIGSERIAL PRIMARY KEY,
    id_conta        BIGINT NOT NULL REFERENCES contas_bancarias(id_conta) ON DELETE RESTRICT,
    id_categoria    BIGINT REFERENCES categorias_financeiras(id_categoria) ON DELETE SET NULL,
    descricao       VARCHAR(180) NOT NULL,
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('receber', 'pagar')),
    valor           NUMERIC(14, 2) NOT NULL CHECK (valor > 0),
    data_vencimento DATE NOT NULL,
    data_pagamento  DATE,
    status          VARCHAR(10) NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'pago', 'atrasado')),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_data_pagamento_pago CHECK (
        (status = 'pago' AND data_pagamento IS NOT NULL) OR
        (status <> 'pago')
    )
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_conta_status ON lancamentos(id_conta, status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_vencimento ON lancamentos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo_status ON lancamentos(tipo, status);

-- Saldo conciliado por conta e banco (3FN: calculado a partir de saldo_inicial + pagos)
CREATE OR REPLACE VIEW vw_saldo_contas_bancarias AS
SELECT
    c.id_conta,
    b.nome AS banco,
    c.apelido_conta,
    c.tipo_conta,
    c.status_conta,
    c.saldo_inicial,
    COALESCE(SUM(
        CASE
            WHEN l.status = 'pago' AND l.tipo = 'receber' THEN l.valor
            WHEN l.status = 'pago' AND l.tipo = 'pagar'   THEN -l.valor
            ELSE 0
        END
    ), 0)::NUMERIC(14, 2) AS variacao_liquidada,
    (c.saldo_inicial + COALESCE(SUM(
        CASE
            WHEN l.status = 'pago' AND l.tipo = 'receber' THEN l.valor
            WHEN l.status = 'pago' AND l.tipo = 'pagar'   THEN -l.valor
            ELSE 0
        END
    ), 0))::NUMERIC(14, 2) AS saldo_atual,
    COUNT(l.id_lancamento) FILTER (WHERE l.status <> 'pago') AS qtd_em_aberto,
    COUNT(l.id_lancamento) FILTER (WHERE l.status = 'atrasado') AS qtd_atrasados
FROM contas_bancarias c
JOIN bancos b ON b.id_banco = c.id_banco
LEFT JOIN lancamentos l ON l.id_conta = c.id_conta
GROUP BY c.id_conta, b.nome, c.apelido_conta, c.tipo_conta, c.status_conta, c.saldo_inicial;

-- Fluxo de caixa diário realizado (base para agregação diária ou mensal)
CREATE OR REPLACE VIEW vw_fluxo_caixa_diario AS
SELECT
    COALESCE(l.data_pagamento, l.data_vencimento) AS data_referencia,
    DATE_TRUNC('month', COALESCE(l.data_pagamento, l.data_vencimento))::DATE AS mes_referencia,
    b.nome AS banco,
    COALESCE(SUM(l.valor) FILTER (WHERE l.status = 'pago' AND l.tipo = 'receber'), 0)::NUMERIC(14, 2) AS entradas_pagas,
    COALESCE(SUM(l.valor) FILTER (WHERE l.status = 'pago' AND l.tipo = 'pagar'), 0)::NUMERIC(14, 2) AS saidas_pagas,
    (
        COALESCE(SUM(l.valor) FILTER (WHERE l.status = 'pago' AND l.tipo = 'receber'), 0) -
        COALESCE(SUM(l.valor) FILTER (WHERE l.status = 'pago' AND l.tipo = 'pagar'), 0)
    )::NUMERIC(14, 2) AS fluxo_liquido_dia
FROM lancamentos l
JOIN contas_bancarias c ON c.id_conta = l.id_conta
JOIN bancos b ON b.id_banco = c.id_banco
GROUP BY
    COALESCE(l.data_pagamento, l.data_vencimento),
    DATE_TRUNC('month', COALESCE(l.data_pagamento, l.data_vencimento)),
    b.nome;