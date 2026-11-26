-- 1. Marcar como atrasado títulos pendentes vencidos antes de hoje
UPDATE lancamentos
SET status = 'atrasado'
WHERE status = 'pendente'
  AND data_vencimento < CURRENT_DATE;

-- 2. Fluxo de caixa diário (hoje)
SELECT
    data_referencia,
    SUM(entradas_pagas) AS total_entradas,
    SUM(saidas_pagas) AS total_saidas,
    SUM(fluxo_liquido_dia) AS saldo_liquido_dia
FROM vw_fluxo_caixa_diario
WHERE data_referencia = CURRENT_DATE
GROUP BY data_referencia;

-- 3. Fluxo de caixa mensal (mês atual)
SELECT
    mes_referencia,
    SUM(entradas_pagas) AS total_entradas_mes,
    SUM(saidas_pagas) AS total_saidas_mes,
    SUM(fluxo_liquido_dia) AS saldo_liquido_mes
FROM vw_fluxo_caixa_diario
WHERE mes_referencia = DATE_TRUNC('month', CURRENT_DATE)::DATE
GROUP BY mes_referencia;