import React, { useMemo, useState } from 'react';
import { Text } from '../components/Text';
import { useApp } from '../AppContext';
import { animateNextLayout } from '../motion';
import { EXPENSE_TYPES, PAYMENT_METHODS, PaymentMethod, paymentMethodLabel } from '../constants';
import { monthLabel, shortDateLabel } from '../dates';
import {
  addVariableExpense,
  deleteVariableExpense,
  toggleVariableExpensePaid,
  updateVariableExpense,
} from '../domain/items';
import { splitCents } from '../domain/installments';
import { displayName, listVariableExpenses } from '../domain/repo';
import type { VariableExpenseView } from '../domain/types';
import { confirm } from '../components/dialogs';
import { ItemRow } from '../components/ItemRow';
import { Button, DayGrid, Field, FormModal, MoneyField, Segmented, SelectField, TextField } from '../components/ui';
import { formatBRL } from '../money';
import { colors, common, tints } from '../theme';
import { ListLayout } from './ListLayout';
import { defaultDate } from './formDefaults';
import { clearError, FieldErrors, FieldKey, hasErrors, validateItemForm } from './validation';

interface Form {
  id: number | null;
  isInstallment: boolean;
  type: string | null;
  name: string;
  cents: number;
  dueDate: string;
  note: string;
  method: PaymentMethod;
  installments: string;
}

export function VariableExpensesScreen() {
  const { db, month, version, run } = useApp();
  const items = useMemo(() => listVariableExpenses(db, month), [db, month, version]);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const editing = items.find((i) => i.id === form?.id) ?? null;

  const paid = items.filter((i) => i.paid).reduce((a, i) => a + i.amountCents, 0);
  const total = items.reduce((a, i) => a + i.amountCents, 0);

  const openNew = () => {
    setErrors({});
    setForm({
      id: null, isInstallment: false, type: null, name: '', cents: 0, dueDate: defaultDate(month), note: '',
      method: 'pix', installments: '1',
    });
  };
  const openEdit = (v: VariableExpenseView) => {
    setErrors({});
    setForm({
      id: v.id,
      isInstallment: v.purchaseId != null,
      type: v.type,
      name: v.name,
      cents: v.purchaseId != null ? v.totalCents ?? v.amountCents : v.amountCents,
      dueDate: v.dueDate,
      note: v.note ?? '',
      method: v.paymentMethod,
      installments: String(v.installments ?? 1),
    });
  };

  /** Atualiza o formulário e apaga o erro do campo mexido. */
  const edit = (patch: Partial<Form>, key?: FieldKey) => {
    if (!form) return;
    setForm({ ...form, ...patch });
    if (key) setErrors((e) => clearError(e, key));
  };

  const installmentsNum = form ? Number.parseInt(form.installments, 10) : NaN;
  const isCredit = form?.method === 'credito';

  const save = () => {
    if (!form) return;
    const found = validateItemForm(form, {
      isTotal: isCredit,
      installments: isCredit ? (Number.isNaN(installmentsNum) ? 0 : installmentsNum) : undefined,
    });
    setErrors(found);
    if (hasErrors(found)) return;
    const input = {
      type: form.type ?? '',
      name: form.name,
      amountCents: form.cents,
      dueDate: form.dueDate,
      note: form.note,
      paymentMethod: form.method,
      installments: isCredit ? (Number.isNaN(installmentsNum) ? 0 : installmentsNum) : undefined,
    };
    const ok = run(() =>
      form.id == null ? (addVariableExpense(db, month, input), animateNextLayout()) : updateVariableExpense(db, form.id, input),
    );
    if (ok) setForm(null);
  };

  const remove = async () => {
    if (!editing) return;
    const msg = editing.purchaseId != null
      ? `A compra "${editing.name}" sai inteira: as ${editing.installments} parcelas, em todos os meses. Isso não pode ser desfeito.`
      : `"${editing.name}" sai deste mês. Isso não pode ser desfeito.`;
    if (!(await confirm(editing.purchaseId != null ? 'Excluir compra parcelada?' : 'Excluir gasto?', msg, editing.purchaseId != null ? 'Excluir compra' : 'Excluir gasto', true))) return;
    if (run(() => { deleteVariableExpense(db, editing.id); animateNextLayout(); })) setForm(null);
  };

  // Ao editar: compra parcelada fica no crédito; gasto comum não vira parcelado.
  const methodOptions = form?.id != null && !form.isInstallment
    ? PAYMENT_METHODS.filter((p) => p.key !== 'credito')
    : PAYMENT_METHODS;

  const preview =
    isCredit && form && form.cents > 0 && installmentsNum >= 1 && installmentsNum <= 120 && form.id == null
      ? splitCents(form.cents, installmentsNum)
      : null;

  return (
    <>
      <ListLayout
        doneLabel="Pago"
        doneCents={paid}
        totalCents={total}
        amountColor={colors.expense}
        addLabel="+ Novo gasto variável"
        onAdd={openNew}
        progressBg={tints.red}
        emoji="🛍️"
        emptyTitle="Nenhum gasto variável ainda"
        emptyText="Mercado, lazer, compras no cartão — anote aqui o que muda de mês a mês."
        count={items.length}
      >
        {items.map((v) => (
          <ItemRow
            key={v.id}
            type={v.type}
            title={displayName(v)}
            subtitle={`${v.type} · ${paymentMethodLabel(v.paymentMethod)} · vence ${shortDateLabel(v.dueDate)}`}
            cents={v.amountCents}
            amountColor={colors.expense}
            done={v.paid}
            doneLabel="Pago"
            pendingLabel="Não pago"
            onToggle={() => run(() => toggleVariableExpensePaid(db, v.id))}
            onPress={() => openEdit(v)}
          />
        ))}
      </ListLayout>

      {form && (
        <FormModal
          visible
          title={form.id == null ? 'Novo gasto variável' : form.isInstallment ? `Editar ${displayName(editing!)}` : 'Editar gasto variável'}
          subtitle={monthLabel(month)}
          emoji="🛍️"
          type={form.type}
          onClose={() => setForm(null)}
          footer={
            <>
              {form.id != null && <Button title="Excluir" variant="danger" onPress={remove} />}
              <Button title="Salvar" onPress={save} />
            </>
          }
        >
          <Field label="Tipo" error={errors.type}>
            <SelectField value={form.type} options={EXPENSE_TYPES} onChange={(type) => edit({ type }, 'type')} />
          </Field>
          <Field label="Nome" error={errors.name}>
            <TextField value={form.name} onChangeText={(name) => edit({ name }, 'name')} placeholder="Ex.: Mercado da semana" maxLength={80} />
          </Field>
          <Field label="Forma de pagamento">
            <Segmented
              value={form.method}
              options={methodOptions}
              onChange={(method) => edit({ method }, 'installments')}
              disabled={form.isInstallment}
            />
          </Field>
          <Field label={isCredit ? 'Valor total' : 'Valor'} error={errors.cents}>
            <MoneyField cents={form.cents} onChange={(cents) => edit({ cents }, 'cents')} />
          </Field>
          {isCredit && (
            <Field label="Quantidade de parcelas" error={errors.installments}>
              <TextField
                value={form.installments}
                onChangeText={(t) => edit({ installments: t.replace(/\D/g, '').slice(0, 3) }, 'installments')}
                keyboardType="number-pad"
                maxLength={3}
              />
              {preview && (
                <Text style={[common.muted, { marginTop: 6 }]}>
                  {installmentsNum}x de {formatBRL(preview.installmentCents)}
                  {preview.lastInstallmentCents !== preview.installmentCents
                    ? ` (última: ${formatBRL(preview.lastInstallmentCents)})`
                    : ''}
                </Text>
              )}
              {form.isInstallment && (
                <Text style={[common.muted, { marginTop: 6 }]}>
                  Mudar o total ou as parcelas recalcula as parcelas deste mês em diante. Parcelas pagas não mudam.
                </Text>
              )}
            </Field>
          )}
          <Field label={isCredit ? 'Vencimento da parcela' : 'Vencimento'}>
            <DayGrid month={month} value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} />
          </Field>
          <Field label="Observação (opcional)">
            <TextField value={form.note} onChangeText={(note) => setForm({ ...form, note })} multiline maxLength={300} />
          </Field>
        </FormModal>
      )}
    </>
  );
}
