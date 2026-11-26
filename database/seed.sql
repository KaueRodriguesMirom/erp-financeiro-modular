INSERT INTO bancos (codigo_ispb, nome) VALUES
    ('00360305', 'Itaú'),
    ('00000000', 'Bradesco'),
    ('90400888', 'Santander'),
    ('18236120', 'Nubank Empresas'),
    ('30306294', 'BTG Pactual')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO contas_bancarias (id_banco, apelido_conta, tipo_conta, saldo_inicial, status_conta)
SELECT b.id_banco, v.apelido, v.tipo, v.saldo, v.status_c
FROM (VALUES
    ('Itaú', 'Conta Principal', 'corrente', 12500.00, 'conciliada'),
    ('Bradesco', 'Operacional Filial', 'corrente', 6400.00, 'conciliada'),
    ('Santander', 'Cobrança / Boleta', 'corrente', 3200.00, 'pendencia'),
    ('Nubank Empresas', 'Pagamentos Cloud', 'pagamento', 8900.00, 'conciliada'),
    ('BTG Pactual', 'Caixa / Reserva', 'reserva', 15000.00, 'reserva')
) AS v(nome_banco, apelido, tipo, saldo, status_c)
JOIN bancos b ON b.nome = v.nome_banco
ON CONFLICT (id_banco, apelido_conta) DO NOTHING;

INSERT INTO categorias_financeiras (nome, natureza) VALUES
    ('Assinaturas & Serviços', 'receber'),
    ('Consultoria & Projetos', 'receber'),
    ('Infraestrutura & Cloud', 'pagar'),
    ('Licenças & Segurança', 'pagar'),
    ('Operação & Suprimentos', 'pagar')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO lancamentos (id_conta, id_categoria, descricao, tipo, valor, data_vencimento, data_pagamento, status)
SELECT c.id_conta, cat.id_categoria, d.descricao, d.tipo, d.valor, d.venc, d.pag, d.st
FROM (VALUES
    ('Itaú', 'Assinaturas & Serviços', 'Contrato SaaS Cliente Alpha', 'receber', 4200.00, DATE '2026-11-25', DATE '2026-11-25', 'pago'),
    ('Nubank Empresas', 'Infraestrutura & Cloud', 'Cluster Cloud & Observabilidade', 'pagar', 950.00, DATE '2026-11-25', NULL, 'pendente'),
    ('Santander', 'Licenças & Segurança', 'Licença Segurança Corporativa', 'pagar', 1300.00, DATE '2026-11-18', NULL, 'atrasado'),
    ('BTG Pactual', 'Consultoria & Projetos', 'Consultoria Arquitetura Q4', 'receber', 6500.00, DATE '2026-11-12', DATE '2026-11-12', 'pago'),
    ('Bradesco', 'Operação & Suprimentos', 'Insumos Operacionais Filial SP', 'pagar', 1180.00, DATE '2026-11-28', NULL, 'pendente')
) AS d(nome_banco, nome_cat, descricao, tipo, valor, venc, pag, st)
JOIN bancos b ON b.nome = d.nome_banco
JOIN contas_bancarias c ON c.id_banco = b.id_banco
LEFT JOIN categorias_financeiras cat ON cat.nome = d.nome_cat;