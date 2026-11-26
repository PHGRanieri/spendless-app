## Objetivo
Criar do zero o $pendless, um app de controle financeiro pessoal para iPhone e Android, com um único código. Todos os dados ficam só no aparelho: sem backend, sem banco externo, sem login e sem rede. O app é offline-first e os dados do usuário NUNCA podem se perder.

## Contexto
- Ponto de partida: diretório vazio. Não existe código.
- Você escolhe a stack multiplataforma e o banco local. O banco precisa ser embarcado, transacional (ACID), leve em disco e rápido em consultas por mês. Justifique as duas escolhas em até 5 linhas no plano.
- Idioma da interface: português do Brasil. Moeda: BRL (R$ 1.234,56).

## Checkpoint obrigatório antes de escrever código
Apresente um plano e PARE até eu aprovar. O plano tem:
1. a stack e o banco, com a justificativa;
2. o modelo de dados (tabelas, campos e tipos);
3. a lista de telas;
4. a lista exata de dependências a instalar;
5. o formato do arquivo de exportação.

## Regras de integridade dos dados (prioridade máxima)
- Guarde valores monetários como inteiros em centavos. NUNCA use float para dinheiro.
- Toda gravação que altera mais de um registro (gerar mês, parcelas, importação) roda dentro de UMA transação. Se der erro, nada muda.
- Use migrações de schema versionadas e só aditivas. NUNCA apague ou recrie tabelas com dados em uma atualização.
- Gerar um mês é idempotente: rodar duas vezes nunca duplica itens.

## Status inicial (vale para TODO item, sem exceção)
Todo item nasce com status pendente:
- entradas como **"não recebida"**;
- gastos (fixos, variáveis e cada parcela de cartão) como **"não pago"**.

Isso vale em todas as formas de criação:
- cadastro manual;
- cópia para um mês novo, seja criado manualmente ou automaticamente no dia 20;
- geração de parcelas;
- recálculo de parcelas.

O status só muda quando o usuário marca o item. Ao copiar um item para outro mês, NUNCA copie o status de origem.

## Modelo de itens
Todo item tem:
- **Tipo**: caixa de seleção, com a lista de opções que corresponde ao tipo de item.
- **Nome**.
- **Valor**.
- **Data**: vencimento para gastos, data prevista para entradas.
- **Status**: recebida/não recebida nas entradas, pago/não pago nos gastos.
- **Observação**: opcional.

Tipos de entrada: Salário, Freelance, Rendimentos, Reembolso, Venda, Outros.

Tipos de gasto: Contas de casa, Alimentação, Mercado, Transporte, Saúde, Academia, Estudos, Lazer, Assinaturas, Pets, Vestuário, Cuidados pessoais, Viagem, Impostos e taxas, Outros.

### 1. Entradas
- Cada entrada é marcada como "fixa" (repete todo mês) ou "do mês" (preenchida só naquele mês).
- A data pode ser hoje ou futura.
- Um botão alterna entre "recebida" e "não recebida".

### 2. Gastos fixos
- Repetem todo mês por padrão.
- Na lista do mês dá para editar, excluir e incluir gastos.
- Ao editar, pergunte se a mudança vale "só este mês" ou "este e os próximos".

### 3. Gastos variáveis
- Campo extra **forma de pagamento**: Crédito, Débito, Pix, Dinheiro ou Boleto.
- **Crédito** mostra os campos **valor total** e **quantidade de parcelas**:
  - Valor da parcela = total ÷ parcelas, em centavos. O resto da divisão vai para a última parcela.
  - Cada parcela aparece no mês correspondente com o rótulo "Nome (3/10)".
  - As parcelas que caem em meses que ainda não existem são lançadas quando esses meses forem criados.
- Mudar a quantidade de parcelas no mês atual recalcula as parcelas deste mês em diante:
  - remove as parcelas que sobrarem ou acrescenta as que faltarem;
  - nunca altera as parcelas já marcadas como pagas.

## Meses
- Um seletor de mês no topo. Todas as telas mostram só o mês escolhido.
- O histórico guarda no máximo 12 meses.
  - Ao passar de 12, o mês mais antigo só é removido depois que o usuário confirmar num diálogo.
  - Esse diálogo oferece exportar os dados antes. NUNCA remova um mês sem confirmação.
- O usuário pode criar manualmente o próximo mês, se ele ainda não existir.
- Criação automática: quando o app abre ou volta para o primeiro plano, se o dia for ≥ 20 e o mês seguinte não existir, crie o mês seguinte com:
  - os gastos fixos do último mês;
  - as entradas fixas do último mês;
  - as parcelas de cartão que vencem nele.
- O mês criado automaticamente NÃO recebe as entradas "do mês".
- Todos os itens do mês novo nascem pendentes, conforme a seção "Status inicial".
- Não use execução em segundo plano para isso.

## Cálculos (tela Resumo, por mês)
- **Total de entradas**: duas cifras, o que já foi recebido e o previsto.
- **Total de saídas**: duas cifras, o que já foi pago e o previsto.
- **Saldo atual** = entradas recebidas − gastos pagos.
- **Saldo previsto no fim do mês** = todas as entradas − todos os gastos, recebidos/pagos ou não.
- Mostre também os gastos por tipo, em uma lista com barra de proporção simples.

## Telas
Navegação por abas: Resumo, Entradas, Gastos fixos, Gastos variáveis, Ajustes.

Em Ajustes ficam exportar e importar:
- **Exportar**:
  - Gera um arquivo JSON com `schemaVersion`, `exportedAt` e todos os dados, incluindo o status de cada item.
  - Abre a planilha de compartilhamento do sistema para salvar em Arquivos, Drive etc.
- **Importar**:
  1. O usuário escolhe o arquivo.
  2. O app valida o schema e a versão.
  3. Mostra um resumo (quantos meses e itens).
  4. Pede confirmação.
  5. Substitui todos os dados numa única transação, preservando os status exportados.
  - Arquivo inválido ou falha no meio = os dados atuais continuam intactos e uma mensagem de erro clara aparece.

## Identidade visual
O visual é clean, com bastante espaço em branco, cantos arredondados de 12px, sem gradientes nem sombras pesadas. Use estas cores:

| Uso | Cor |
|---|---|
| Primária | #16A34A |
| Primária escura | #14532D |
| Destaque suave | #DCFCE7 |
| Fundo | #F8FAF9 |
| Texto | #0F172A |
| Texto secundário | #64748B |
| Saídas | #DC2626 |
| Pendente | #D97706 |

Valores em destaque usam números tabulares. O nome do app aparece como "$pendless".

## Escopo e restrições
- Faça só o que está descrito aqui. Sem login, nuvem, notificações, modo escuro, gráficos complexos ou outras funções não pedidas.
- Use o mínimo de dependências: só as listadas no plano aprovado.

## Critérios de aceite
- [ ] O app roda em iOS e Android pelo fluxo padrão da stack escolhida.
- [ ] Testes unitários passam para:
  - [ ] saldo atual e saldo previsto;
  - [ ] divisão de parcelas com centavos;
  - [ ] edição da quantidade de parcelas;
  - [ ] geração idempotente do mês no dia 20;
  - [ ] limite de 12 meses com confirmação;
  - [ ] ida e volta exportar → importar, com dados idênticos;
  - [ ] itens nascendo pendentes.
- [ ] O teste de itens pendentes cobre cada caminho:
  - [ ] cadastro manual;
  - [ ] mês criado manualmente;
  - [ ] mês criado automaticamente, cujos itens vêm de um mês com tudo pago/recebido;
  - [ ] parcelas geradas e recalculadas.
- [ ] Uma importação com arquivo corrompido não altera nenhum dado.
- [ ] Os dados continuam salvos depois de fechar o app à força e reabrir.

## Limites de ação
- Pare e pergunte antes de:
  - instalar dependências fora do plano;
  - mudar o modelo de dados aprovado;
  - apagar qualquer arquivo que você não criou.
- Se o mesmo teste falhar 3 vezes seguidas com a mesma abordagem de correção, pare e relate o erro e o que você tentou.

## Evidência de progresso
- Avise a cada etapa concluída: plano, modelo de dados, telas, cálculos, exportar/importar, testes.
- No final, mostre a saída real dos testes e como rodar o app no celular.
