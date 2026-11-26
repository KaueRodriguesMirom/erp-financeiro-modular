from datetime import date
from decimal import Decimal
import os
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import psycopg
from psycopg.rows import dict_row
from pydantic import BaseModel, Field

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres@localhost:5432/erp_financeiro",
)

app = FastAPI(title="ERP Financeiro Modular API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn():
    try:
        return psycopg.connect(DATABASE_URL, row_factory=dict_row)
    except psycopg.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao conectar ao PostgreSQL ({DATABASE_URL}): {exc}",
        ) from exc


class LancamentoCreate(BaseModel):
    id_conta: int = Field(..., gt=0)
    id_categoria: int | None = Field(default=None, gt=0)
    descricao: str = Field(..., min_length=2, max_length=180)
    tipo: Literal["receber", "pagar"]
    valor: Decimal = Field(..., gt=0)
    data_vencimento: date
    status: Literal["pendente", "pago", "atrasado"] = "pendente"
    data_pagamento: date | None = None


class LancamentoPagarRequest(BaseModel):
    data_pagamento: date | None = None


@app.get("/health")
def health():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1;")
        return {"status": "ok", "database": "erp_financeiro"}
    finally:
        conn.close()


@app.get("/contas")
def listar_contas():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            rows = cur.execute(
                """
                SELECT
                    id_conta,
                    banco,
                    apelido_conta,
                    tipo_conta,
                    status_conta,
                    saldo_inicial,
                    variacao_liquidada,
                    saldo_atual,
                    qtd_em_aberto,
                    qtd_atrasados
                FROM vw_saldo_contas_bancarias
                ORDER BY id_conta;
                """
            ).fetchall()
        return rows
    finally:
        conn.close()


@app.get("/fluxo-caixa")
def fluxo_caixa(
    periodo: Literal["diario", "mensal"] = Query(default="mensal"),
    data_ref: date | None = Query(default=None),
):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            if periodo == "diario":
                query = """
                    SELECT
                        data_referencia,
                        COALESCE(SUM(entradas_pagas), 0)::NUMERIC(14, 2) AS total_entradas,
                        COALESCE(SUM(saidas_pagas), 0)::NUMERIC(14, 2) AS total_saidas,
                        COALESCE(SUM(fluxo_liquido_dia), 0)::NUMERIC(14, 2) AS saldo_liquido
                    FROM vw_fluxo_caixa_diario
                    WHERE data_referencia = COALESCE(%s, CURRENT_DATE)
                    GROUP BY data_referencia;
                """
                row = cur.execute(query, (data_ref,)).fetchone()
                return row or {
                    "data_referencia": (data_ref or date.today()).isoformat(),
                    "total_entradas": "0.00",
                    "total_saidas": "0.00",
                    "saldo_liquido": "0.00",
                }

            query = """
                SELECT
                    mes_referencia,
                    COALESCE(SUM(entradas_pagas), 0)::NUMERIC(14, 2) AS total_entradas,
                    COALESCE(SUM(saidas_pagas), 0)::NUMERIC(14, 2) AS total_saidas,
                    COALESCE(SUM(fluxo_liquido_dia), 0)::NUMERIC(14, 2) AS saldo_liquido
                FROM vw_fluxo_caixa_diario
                WHERE mes_referencia = DATE_TRUNC('month', COALESCE(%s, CURRENT_DATE))::DATE
                GROUP BY mes_referencia;
            """
            row = cur.execute(query, (data_ref,)).fetchone()
            mes_alvo = (data_ref or date.today()).replace(day=1).isoformat()
            return row or {
                "mes_referencia": mes_alvo,
                "total_entradas": "0.00",
                "total_saidas": "0.00",
                "saldo_liquido": "0.00",
            }
    finally:
        conn.close()


@app.get("/lancamentos")
def listar_lancamentos(
    status: Literal["pendente", "pago", "atrasado"] | None = None,
    tipo: Literal["receber", "pagar"] | None = None,
):
    sql = """
        SELECT
            l.id_lancamento,
            l.id_conta,
            b.nome AS banco,
            c.apelido_conta,
            l.id_categoria,
            cat.nome AS categoria,
            l.descricao,
            l.tipo,
            l.valor,
            l.data_vencimento,
            l.data_pagamento,
            l.status
        FROM lancamentos l
        JOIN contas_bancarias c ON c.id_conta = l.id_conta
        JOIN bancos b ON b.id_banco = c.id_banco
        LEFT JOIN categorias_financeiras cat ON cat.id_categoria = l.id_categoria
        WHERE (%s IS NULL OR l.status = %s)
          AND (%s IS NULL OR l.tipo = %s)
        ORDER BY l.data_vencimento ASC, l.id_lancamento DESC;
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            rows = cur.execute(sql, (status, status, tipo, tipo)).fetchall()
        return rows
    finally:
        conn.close()


@app.post("/lancamentos", status_code=201)
def criar_lancamento(payload: LancamentoCreate):
    data_pgto = payload.data_pagamento
    if payload.status == "pago" and data_pgto is None:
        data_pgto = date.today()
    if payload.status != "pago":
        data_pgto = None

    sql = """
        INSERT INTO lancamentos (
            id_conta, id_categoria, descricao, tipo, valor,
            data_vencimento, data_pagamento, status
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id_lancamento, id_conta, id_categoria, descricao, tipo,
                  valor, data_vencimento, data_pagamento, status;
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            row = cur.execute(
                sql,
                (
                    payload.id_conta,
                    payload.id_categoria,
                    payload.descricao.strip(),
                    payload.tipo,
                    payload.valor,
                    payload.data_vencimento,
                    data_pgto,
                    payload.status,
                ),
            ).fetchone()
        conn.commit()
        return row
    except psycopg.Error as exc:
        conn.rollback()
        raise HTTPException(
            status_code=400, detail=f"Erro ao inserir lançamento: {exc}"
        ) from exc
    finally:
        conn.close()


@app.patch("/lancamentos/{id_lancamento}/pagar")
def liquidar_lancamento(id_lancamento: int, body: LancamentoPagarRequest | None = None):
    data_pgto = body.data_pagamento if (body and body.data_pagamento) else date.today()
    sql = """
        UPDATE lancamentos
        SET status = 'pago',
            data_pagamento = %s
        WHERE id_lancamento = %s
        RETURNING id_lancamento, id_conta, descricao, tipo, valor,
                  data_vencimento, data_pagamento, status;
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            row = cur.execute(sql, (data_pgto, id_lancamento)).fetchone()
        conn.commit()
    except psycopg.Error as exc:
        conn.rollback()
        raise HTTPException(
            status_code=400, detail=f"Erro ao liquidar lançamento: {exc}"
        ) from exc
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")
    return row