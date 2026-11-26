---
name: $pendless
description: Controle financeiro pessoal, mês a mês, offline e aconchegante.
colors:
  broto: "#16A34A"
  floresta: "#14532D"
  orvalho: "#DCFCE7"
  fundo-linho: "#F8FAF9"
  louca: "#FFFFFF"
  tinta: "#0F172A"
  ardosia: "#64748B"
  nevoa: "#E2E8F0"
  brasa: "#DC2626"
  brasa-tostada: "#B91C1C"
  mel: "#D97706"
  mel-tostado: "#92400E"
typography:
  display:
    fontFamily: "Nunito-ExtraBold"
    fontSize: "34px"
    fontWeight: 800
    letterSpacing: "-1px"
  headline:
    fontFamily: "Nunito-ExtraBold"
    fontSize: "38px"
    fontWeight: 800
    letterSpacing: "-0.5px"
    fontFeature: "tnum"
  title:
    fontFamily: "Nunito-Bold"
    fontSize: "18px"
    fontWeight: 700
  body:
    fontFamily: "Nunito-Regular"
    fontSize: "15px"
    fontWeight: 400
  label:
    fontFamily: "Nunito-SemiBold"
    fontSize: "13px"
    fontWeight: 500
  amount:
    fontFamily: "Nunito-Bold"
    fontSize: "16px"
    fontWeight: 700
    fontFeature: "tnum"
  pill:
    fontFamily: "Nunito-Bold"
    fontSize: "12px"
    fontWeight: 700
rounded:
  md: "12px"
  lg: "24px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.floresta}"
    textColor: "{colors.louca}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  button-secondary:
    backgroundColor: "{colors.orvalho}"
    textColor: "{colors.floresta}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  button-danger:
    backgroundColor: "rgba(220,38,38,0.10)"
    textColor: "{colors.brasa-tostada}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  status-pill-done:
    backgroundColor: "{colors.orvalho}"
    textColor: "{colors.floresta}"
    typography: "{typography.pill}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  status-pill-pending:
    backgroundColor: "rgba(217,119,6,0.12)"
    textColor: "{colors.mel-tostado}"
    typography: "{typography.pill}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  card:
    backgroundColor: "{colors.louca}"
    rounded: "{rounded.md}"
    padding: "16px"
  hero-card:
    backgroundColor: "{colors.floresta}"
    textColor: "{colors.louca}"
    rounded: "{rounded.md}"
    padding: "24px"
  dialog:
    backgroundColor: "{colors.louca}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "24px"
  button-dialog-danger:
    backgroundColor: "{colors.brasa}"
    textColor: "{colors.louca}"
    rounded: "{rounded.md}"
    height: "48px"
  input:
    backgroundColor: "{colors.louca}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "12px"
  type-badge:
    rounded: "{rounded.full}"
    size: "40px"
  tab-active:
    backgroundColor: "{colors.orvalho}"
    textColor: "{colors.floresta}"
    rounded: "{rounded.full}"
    padding: "4px 16px"
---

# Design System: $pendless

## Overview

**Creative North Star: "A Cozinha Arrumada"**

O $pendless é uma cozinha arrumada: tudo tem seu lugar, cada coisa tem sua cor, e o ambiente é quente sem ser bagunçado. O usuário entra várias vezes por mês para uma tarefa curta (marcar uma conta como paga, lançar uma compra, conferir o saldo) e precisa achar tudo onde deixou. O aconchego vem dos detalhes: a Nunito arredondada, um emoji para cada categoria, pílulas macias e frases gentis. Não vem de enfeite.

A densidade é de app de uso diário: um mês por tela, cartões brancos sobre fundo linho, números grandes e alinhados. A cor trabalha: verde para o que entrou ou já foi pago, âmbar para o que está pendente, vermelho para saídas. O único momento de peso visual é o cartão do saldo atual, em verde floresta, a "bancada principal" da cozinha.

Identidade única em iOS e Android: o visual é do $pendless, não do sistema. As convenções nativas valem para o comportamento (margens seguras, teclado, gesto de voltar, compartilhar, movimento reduzido).

**Key Characteristics:**
- Fundo linho claro, cartões de louça branca com sombra leve e cantos de 12px.
- Nunito em quatro pesos, com números tabulares em todos os valores.
- Um emoji em círculo tingido por categoria: a "etiqueta do pote".
- Cor com função: verde concluído, âmbar pendente, vermelho saída.
- Movimento só como resposta ao toque ou para evitar saltos; nunca decorativo em dados.

## Colors

Uma paleta de horta e cozinha: verdes que crescem, um âmbar de mel e um vermelho de brasa, sobre neutros de linho e louça.

### Primary
- **Broto** (#16A34A): o verde do "deu certo" fora do texto. O "$" do nome, barras de progresso, círculos de categoria e textos grandes (≥19px em negrito). Não serve para texto pequeno nem como fundo de botão com texto branco (3,30:1).
- **Floresta** (#14532D): o verde profundo da confiança e a cor de ação. Fundo dos botões primários, do botão de criar mês, do chip ativo e do dia selecionado (texto branco 9,1:1); valores de entrada em texto; cartão do saldo atual; o "pendless" do nome; aba ativa.
- **Orvalho** (#DCFCE7): o verde mais claro. Pílula de status concluído, fundo da aba ativa, círculo do emoji nos estados vazios, setas do seletor de mês.

### Secondary
- **Mel** (#D97706): tudo que está pendente, como fundo (tint de 12% na pílula).
- **Mel Tostado** (#92400E): só texto de pendente, sobre o tint de Mel (6,25:1). Aprovado como exceção à paleta original, por contraste.
- **Brasa** (#DC2626): saídas e alerta. Valores de gastos, barra de pagos, selo "no vermelho", borda de campo com erro e a confirmação final de exclusão. Nunca como fundo de tela inteira.
- **Brasa Tostada** (#B91C1C): só texto sobre o tint de Brasa (5,5:1): botão Excluir tonal e mensagem de erro de campo. Exceção por contraste, como a Mel Tostado.

### Neutral
- **Fundo Linho** (#F8FAF9): o fundo de todas as telas.
- **Louça** (#FFFFFF): cartões, campos, barra de abas e cabeçalho dos formulários.
- **Tinta** (#0F172A): texto principal e valores neutros.
- **Ardósia** (#64748B): rótulos, subtítulos, dicas e abas inativas.
- **Névoa** (#E2E8F0): bordas de campos, divisórias e dias desabilitados.

### Named Rules
**The Readable Green Rule.** Texto pequeno e texto sobre botão nunca usam Broto: usam Floresta. Todo texto passa de 4,5:1 (grande, 3:1).

**The Tint, Not New Hue Rule.** Cores novas não entram. Fundos suaves são a própria cor oficial com opacidade (10–15%), nunca um tom inventado. Isso vale para os círculos dos emojis, as pílulas pendentes e as trilhas das barras.

**The Color Means Status Rule.** Verde sempre significa recebido/pago ou positivo, âmbar sempre pendente, vermelho sempre saída ou negativo. Nenhuma dessas cores é usada só para enfeitar.

## Typography

**Display Font:** Nunito ExtraBold (com fonte do sistema como fallback)
**Body Font:** Nunito Regular / SemiBold / Bold

**Character:** uma única família arredondada em quatro pesos. Os terminais suaves dão o tom amigável, e os pesos altos dão firmeza aos números. Os dígitos da Nunito têm largura fixa por padrão (600 unidades), então os valores ficam alinhados sem recurso extra.

### Hierarchy
- **Display** (800, 34px, espaçamento -1px): só o nome "$pendless" no cabeçalho.
- **Headline** (800, 38px, tabular): o valor do saldo atual no cartão Floresta, que encolhe para caber numa linha.
- **Title** (700, 18px): títulos de seção ("Para onde vai o dinheiro"), de cartões e de estados vazios.
- **Body** (400, 15px): nomes de tipo, textos de apoio e campos (16px dentro de campos).
- **Label** (500, 13px): rótulos de campos e de totais ("Recebido", "Previsto").
- **Amount** (700, 15–22px, tabular): todo valor em R$, colorido pelo status.
- **Pill** (700, 12px): texto das pílulas de status, sempre com ✓ ou ○ na frente.

### Named Rules
**The One Family Rule.** Só a Nunito. A hierarquia vem de peso e tamanho, nunca de uma segunda fonte.

**The Weight Maps to File Rule.** O peso é resolvido para o arquivo da fonte (`Nunito-Regular`, `-SemiBold`, `-Bold`, `-ExtraBold`) pelo componente `Text` do app. Nunca use o `Text` puro do React Native.

## Layout

Uma coluna de cartões em rolagem vertical, com margens laterais de 16px. O ritmo de espaçamento é 4 / 8 / 12 / 16 / 24px. A estrutura fixa é: cabeçalho (nome, frase e seletor de mês em pílula), conteúdo da aba e barra de 5 abas na base, respeitando as margens seguras. Formulários abrem em tela cheia, com rodapé fixo de ações e teclado tratado (`padding` no iOS). Listas mostram primeiro o cartão de totais com barra de progresso, depois a ação de incluir, depois os itens. A data é escolhida numa grade própria de 7 colunas com os dias do mês selecionado.

## Elevation & Depth

Profundidade leve e ambiente. Os cartões flutuam um pouco acima do fundo linho com uma sombra difusa tingida de Floresta: no iOS opacidade 0.07, raio 10, deslocamento de 3px; no Android elevation 2. Nada além disso: a hierarquia vem de cor e tamanho. O cartão do saldo dispensa sombra, porque a massa de Floresta já o destaca.

### Shadow Vocabulary
- **Ambiente leve** (`shadowColor #14532D, opacity 0.07, radius 10, offset 0/3` · Android `elevation 2`): cartões, linhas de item, seletor de mês, lista vazia.

### Named Rules
**The No Heavy Shadow Rule.** Nenhuma sombra passa de 0.08 de opacidade, e não existem gradientes. Se algo precisa de mais destaque, ganha cor, não sombra.

## Shapes

Duas formas: retângulo com cantos suaves de 12px (cartões, campos, botões, grade de dias, cartão do saldo) e pílula totalmente arredondada (status, chips de seleção, seletor de mês, botão de criar mês, aba ativa, barras de progresso). Os emojis de categoria vivem em círculos perfeitos de 36–40px. A única superfície maior, o diálogo de confirmação, usa o dobro do raio (24px) para não parecer um bloco quadrado.

## Components

### Buttons
Macios e confiantes: ocupam a largura disponível e respondem ao toque encolhendo de leve.
- **Shape:** cantos suaves (12px), 14px de altura interna.
- **Primary:** fundo Floresta, texto Louça 16px peso 700.
- **Secondary:** fundo Orvalho, sem borda, texto Floresta (ex.: "Cadastrar" do estado vazio).
- **Danger:** tint de Brasa a 10%, sem borda, texto Brasa Tostada (Excluir). O vermelho cheio fica para a confirmação final, no diálogo: tocar → confirmar → vermelho.
- **Nenhum botão de ação é só contorno.** Texto 16px peso 700.
- **Toque:** encolhe para 97% em 120ms e volta em 160ms, com a curva `bezier(0.23, 1, 0.32, 1)`. Desabilitado: opacidade 0.5. Com Reduzir Movimento, troca a escala por opacidade 0.8.

### Status Pill (signature)
O gesto mais frequente do app.
- **Concluído:** fundo Orvalho, texto Floresta, "✓ Pago" ou "✓ Recebida".
- **Pendente:** fundo Mel a 12%, texto Mel Tostado, "○ Não pago" ou "○ Não recebida".
- **Leitor de tela:** papel de caixa de seleção com estado marcado. Dentro da linha do item, a troca de status é uma ação de acessibilidade da própria linha.
- **Toque:** encolhe para 96% em 100ms e volta com mola rápida (tension 300, friction 20). A cor troca na hora.

### Cards / Containers
- **Corner Style:** cantos suaves (12px).
- **Background:** Louça; o cartão do saldo usa Floresta com texto branco e detalhes em branco a 75%.
- **Shadow Strategy:** ambiente leve (ver Elevation).
- **Border:** nenhuma.
- **Internal Padding:** 16px (24px no cartão do saldo, 12px nas linhas de item).

### Item Row
Círculo de emoji (40px), nome em 15px peso 700 e subtítulo Ardósia 12px ("Tipo · Forma · vence 05/11"). À direita, o valor colorido pelo status e a pílula de status embaixo. Tocar a linha abre a edição; tocar a pílula alterna o status.

### Type Badge (signature)
Cada tipo de entrada ou gasto tem um emoji fixo dentro de um círculo com tint de 14% de uma das cores oficiais. Exemplos: 🛒 Mercado, 🏠 Contas de casa, 🐾 Pets. O mapa completo está em `src/typeIcons.ts`. Ele aparece nas linhas, na caixa de seleção de tipo e em "Para onde vai o dinheiro".

### Form Sheet (cadastro e edição)
Tela cheia sobre o linho. Cabeçalho sem divisória: a "etiqueta do pote" (círculo de 48px com o emoji do tipo escolhido, ou o da seção antes da escolha), título 24px peso 800, o mês em Ardósia embaixo e fechar como círculo Orvalho de 40px com ✕ Floresta. Rodapé fixo em Louça com cantos superiores de 24px e sombra ambiente voltada para cima, com Excluir tonal e Salvar Floresta.

### Inputs / Fields
- **Style:** fundo Louça, borda Névoa de 1px, cantos de 12px, texto 16px. Em foco, borda Floresta.
- **Erro:** a validação roda na tela antes de salvar e mostra todos os problemas de uma vez. Borda Brasa, fundo com 4% de Brasa e mensagem Brasa Tostada 13px peso 600 embaixo do campo; o erro some assim que o usuário mexe no campo.
- **Valor em R$:** campo com máscara que preenche os centavos da direita para a esquerda, 20px peso 600 tabular.
- **Caixa de seleção:** campo que abre uma lista em folha branca sobre véu de Tinta a 35%, com emoji em cada opção e ✓ na escolhida.
- **Segmentado:** chips em pílula de no mínimo 44px de altura; o ativo fica com fundo Floresta e texto branco.

### Progress Bar
Trilha em pílula de 8–10px com tint da cor do status e preenchimento na cor cheia. Quando o valor muda dentro do mesmo mês, a largura anima em 240ms com a curva padrão. Ao montar ou trocar de mês, já aparece no lugar.

### Confirmation Dialog (signature)
Substitui o alerta do sistema em toda confirmação e em todo aviso: exclusões, escopo de fixos, importação, limite de 12 meses, erros e sucesso (`notify` em `src/components/dialogs.ts`). O alerta nativo não aparece no app.
- **Aviso de erro:** emoji 😕 em círculo com tint de Brasa, um botão primário "Entendi". **Sucesso:** 🎉 em Orvalho, botão "Ótimo".
- **Forma:** cartão Louça com cantos de 24px, sombra ambiente leve, largura máxima de 420px, sobre véu de Tinta a 45%.
- **Conteúdo:** emoji de 30px num círculo de 64px (tint de Brasa a 10% quando destrutivo, Orvalho quando neutro), título 20px peso 800 centralizado, mensagem Ardósia 15px.
- **Ações:** empilhadas em largura total, 48px de altura: destrutiva cheia em Brasa com texto branco (4,83:1), destrutiva secundária tonal (tint de Brasa, texto Brasa Tostada), primária Floresta, secundária tonal Orvalho, "Cancelar" como texto Ardósia.
- **Movimento:** véu em fade e cartão de 96% para 100% em 220ms; sai em 140ms. Com Reduzir Movimento, só fade. O resultado é entregue depois que o diálogo fecha.
- **Texto:** o título pergunta ("Excluir gasto?") e o botão nomeia a ação ("Excluir gasto"); a mensagem diz o que sai e que não pode ser desfeito.

### Logo & Abertura
- **Logo "Broto no $":** ladrilho Floresta (cantos de 22%), cifrão branco de traço arredondado e a haste brotando em duas folhas, Broto à direita e Orvalho à esquerda. Fontes em `assets/logo/` (`gen-logo.js` regera todos os PNGs).
- **Abertura:** o splash nativo mostra o ladrilho sem as folhas, sobre o linho, com 160px. A camada JS (`src/components/Splash.tsx`) começa idêntica, as folhas brotam da ponta da haste (440ms, a esquerda 70ms depois), o wordmark sobe 8px com fade e a camada some em 200ms. Total ≈ 1,15s. Com Reduzir Movimento, tudo já está no lugar e só há o fade.

### Navigation
Barra inferior branca com 5 abas: emoji + rótulo de 11px. A aba ativa ganha pílula Orvalho atrás do emoji e rótulo Floresta peso 800; as inativas ficam com o emoji a 55% e o rótulo Ardósia. Não há animação de troca de aba. O seletor de mês é uma pílula branca com setas em círculos Orvalho.

### Empty State
Cartão central com emoji de 34px num círculo Orvalho de 72px, título gentil, texto de apoio e botão secundário de ação. Entra uma única vez: sobe 8px com fade em 320ms, e o emoji assenta com mola leve 60ms depois.

## Do's and Don'ts

### Do:
- **Do** usar as cores oficiais e os tints delas (10–15%) para fundos suaves.
- **Do** confirmar exclusões com o diálogo de confirmação do app, nunca com o alerta do sistema.
- **Do** escrever todo valor em R$ com o componente de valor (peso 700, tabular), colorido por status: Broto entradas, Brasa saídas, Tinta neutro.
- **Do** dar a toda categoria nova um emoji e uma cor-base oficial em `src/typeIcons.ts`.
- **Do** usar cantos de 12px em blocos e pílula totalmente arredondada em status, chips e seletores.
- **Do** manter animações curtas (100–320ms) e respeitar o Reduzir Movimento do sistema.
- **Do** usar frases gentis nos estados vazios e nos textos de apoio ("Nada por aqui ainda 🌱").

### Don't:
- **Don't** usar gradientes ou sombras acima de 0.08 de opacidade.
- **Don't** introduzir cores fora da paleta, uma segunda família de fonte ou modo escuro.
- **Don't** animar troca de abas, troca de mês ou números de saldo: são navegação frequente e dados que o usuário lê.
- **Don't** usar vermelho como fundo de tela ou de cartão grande; o negativo aparece como selo ou pílula.
- **Don't** adotar o visual Material ou Cupertino por plataforma: a identidade é única nos dois sistemas.
- **Don't** usar o `Text` ou o `TextInput` puros do React Native; use os de `src/components/Text.tsx`.
