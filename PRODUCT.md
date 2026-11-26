# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Ships to iOS and Android from one Expo (React Native) codebase. Confirmed by the user: the app keeps ONE shared $pendless identity on both systems instead of restyling itself per OS. Platform conventions apply to behavior and OS guarantees (safe areas, keyboard, system back gesture, share sheet, file picker, Reduce Motion), not to the brand layer.

## Users

The general public in Brazil, through the App Store and Google Play (confirmed). People who want to organize their personal money month by month: what comes in, what is fixed, what varies, and which card installments land in each month. Development and testing happen on Windows with Android; the final test with a real user happens on an iPhone through Expo Go.

## Product Purpose

A personal finance controller that answers, for the selected month: how much has already come in and gone out, what is still pending, the current balance (received − paid) and the expected end-of-month balance (all income − all expenses). Success: the user trusts the numbers, never loses data, and keeps using it every month without anxiety.

## Positioning

- **Total privacy:** no account, no cloud, no network. Data lives only on the device; export/import is the user's own JSON file.
- **Month-by-month control:** every screen shows one month. From day 20 the next month is created automatically with fixed items, fixed income and the card installments due, all born pending.
- **Simplicity:** only the essentials (income, fixed expenses, variable expenses, credit installments). No investments, no complex charts.
- **Cozy:** a finance app that does not cause anxiety: friendly tone and a welcoming feel.

## Operating Context

Used on the phone at moments like payday, paying a bill, or after a purchase: open the month, mark items as paid/received, add an expense, check the balance. History keeps at most 12 months; removing the oldest always requires confirmation and offers export first. Backups are shared through the system share sheet (Files, Drive, etc.).

## Capabilities and Constraints

- Interface in Brazilian Portuguese; currency BRL formatted as `R$ 1.234,56`.
- Money stored as integer cents; never float. Highlighted values use tabular numerals.
- Every item is born pending ("não recebida" / "não pago") in every creation path; status changes only when the user marks it.
- Item model: type (fixed lists per kind), name, amount, date (due date for expenses, expected date for income), status, optional note.
  - Income types: Salário, Freelance, Rendimentos, Reembolso, Venda, Outros.
  - Expense types: Contas de casa, Alimentação, Mercado, Transporte, Saúde, Academia, Estudos, Lazer, Assinaturas, Pets, Vestuário, Cuidados pessoais, Viagem, Impostos e taxas, Outros.
  - Payment methods: Crédito, Débito, Pix, Dinheiro, Boleto. Credit splits into installments labeled "Nome (3/10)".
- Fixed items ask "só este mês" or "este e os próximos" when edited or deleted.
- Tabs: Resumo, Entradas, Gastos fixos, Gastos variáveis, Ajustes (export/import).
- Offline-first, local SQLite with transactions and additive-only migrations. Data must never be lost.
- Out of scope (explicit): login, cloud, notifications, dark mode, complex charts, any feature not requested.
- New dependencies require the user's approval before installation.

## Brand Commitments

- Name always written as **$pendless**.
- Core palette fixed by the original brief: primária #16A34A, primária escura #14532D, destaque suave #DCFCE7, fundo #F8FAF9, texto #0F172A, texto secundário #64748B, saídas #DC2626, pendente #D97706.
- Rounded corners of 12px; no gradients and no heavy shadows (the user later accepted light shadows).
- Font: Nunito, embedded in the app (approved by the user).
- Tone: friendly and welcoming ("Seu dinheiro, em ordem."), never alarmist about money.

## Evidence on Hand

- Original product brief: `PROMPT.md`.
- No testimonials, users, metrics, store listing, screenshots or logo files exist yet. Future work must not invent them.

## Product Principles

1. The numbers are always right: integer cents, atomic writes, nothing changes without the user's action.
2. The user owns the data: it stays on the phone, and leaving (export) is always one tap away.
3. One month at a time: every screen answers "how is this month going?" before anything else.
4. Calm over clever: friendly, simple, and fast for something opened many times a month.

## Accessibility & Inclusion

Respect the system Reduce Motion setting (already implemented). Other accessibility targets have not been decided yet.
