# ERP Financeiro Modular

Sistema **ERP Financeiro** focado no controle de **contas a pagar**, **contas a receber**, **fluxo de caixa diário e mensal**, **status de pagamento** (`pendente`, `pago` e `atrasado`) e **conciliação de contas bancárias** separadas por instituição.

## Funcionalidades

- **Contas a Pagar e a Receber:** Cadastro, filtragem por status e banco, alternância rápida de estado e exclusão de lançamentos.
- **Controle de Status e Vencimentos:** Identificação de títulos `pendente`, `pago` e `atrasado`, com checagem automática de lançamentos vencidos.
- **Visão Multi-Banco:** Acompanhamento de saldo conciliado e alertas por instituição (Itaú, Bradesco, Santander, Nubank Empresas e BTG Pactual).
- **Fluxo de Caixa Diário e Mensal:** Cálculo de entradas, saídas e saldo líquido realizado no período selecionado.
- **Persistência e Exportação:** Armazenamento local no navegador e exportação do estado financeiro em formato `.json`.

## Stack Utilizada

- **Frontend:** HTML5, CSS3 (tema escuro de alto contraste com acentos em verde neon e roxo) e JavaScript (Vanilla JS).
- **Ambiente de Desenvolvimento:** Policorp Linux (Debian), VS Code e Git.

## Como Executar Localmente

1. Clone o repositório:
   ```bash
   git clone [https://github.com/KaueRodriguesMirom/erp-financeiro-modular.git](https://github.com/KaueRodriguesMirom/erp-financeiro-modular.git)
   cd erp-financeiro-modular
