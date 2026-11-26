import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { animateNextLayout } from '../motion';
import { EXPENSE_TYPES } from '../constants';
import { shortDateLabel } from '../dates';
import { addFixedExpense, deleteFixedExpense, toggleFixedExpensePaid, updateFixedExpense } from '../domain/items';
import { listFixedExpenses } from '../domain/repo';
import type { FixedExpense } from '../domain/types';
import { askScope } from '../components/dialogs';
import { ItemRow } from '../components/ItemRow';
import { Button, DayGrid, Field, FormModal, MoneyField, SelectField, TextField } from '../components/ui';
import { colors, tints } from '../theme';
import { ListLayout } from './ListLayout';
import { defaultDate } from './formDefaults';

interface Form {
  id: number | null;
  type: string | null;
  name: string;
  cents: number;
  dueDate: string;
  note: string;
}

export function FixedExpensesScreen() {
  const { db, month, version, run } = useApp();
  const items = useMemo(() => listFixedExpenses(db, month), [db, month, version]);
  const [form, setForm] = useState<Form | null>(null);

  const paid = items.filter((i) => i.paid).reduce((a, i) => a + i.amountCents, 0);
  const total = items.reduce((a, i) => a + i.amountCents, 0);

  const openNew = () => setForm({ id: null, type: null, name: '', cents: 0, dueDate: defaultDate(month), note: '' });
  const openEdit = (f: FixedExpense) =>
    setForm({ id: f.id, type: f.type, name: f.name, cents: f.amountCents, dueDate: f.dueDate, note: f.note ?? '' });

  const save = async () => {
    if (!form) return;
    const input = { type: form.type ?? '', name: form.name, amountCents: form.cents, dueDate: form.dueDate, note: form.note };
    if (form.id == null) {
      if (run(() => { addFixedExpense(db, month, input); animateNextLayout(); })) setForm(null);
      return;
    }
    const scope = await askScope('editar');
    if (!scope) return;
    if (run(() => updateFixedExpense(db, form.id!, input, scope))) setForm(null);
  };

  const remove = async () => {
    if (!form?.id) return;
    const scope = await askScope('excluir');
    if (!scope) return;
    if (run(() => { deleteFixedExpense(db, form.id!, scope); animateNextLayout(); })) setForm(null);
  };

  return (
    <>
      <ListLayout
        doneLabel="Pago"
        doneCents={paid}
        totalCents={total}
        amountColor={colors.expense}
        addLabel="+ Novo gasto fixo"
        onAdd={openNew}
        progressBg={tints.red}
        emoji="📌"
        emptyTitle="Nenhum gasto fixo ainda"
        emptyText="Aluguel, contas, assinaturas… cadastre uma vez e eles se repetem todo mês."
        count={items.length}
      >
        {items.map((f) => (
          <ItemRow
            key={f.id}
            type={f.type}
            title={f.name}
            subtitle={`${f.type} · vence ${shortDateLabel(f.dueDate)}`}
            cents={f.amountCents}
            amountColor={colors.expense}
            done={f.paid}
            doneLabel="Pago"
            pendingLabel="Não pago"
            onToggle={() => run(() => toggleFixedExpensePaid(db, f.id))}
            onPress={() => openEdit(f)}
          />
        ))}
      </ListLayout>

      {form && (
        <FormModal
          visible
          title={form.id == null ? 'Novo gasto fixo' : 'Editar gasto fixo'}
          onClose={() => setForm(null)}
          footer={
            <>
              {form.id != null && <Button title="Excluir" variant="danger" onPress={remove} />}
              <Button title="Salvar" onPress={save} />
            </>
          }
        >
          <Field label="Tipo">
            <SelectField value={form.type} options={EXPENSE_TYPES} onChange={(type) => setForm({ ...form, type })} />
          </Field>
          <Field label="Nome">
            <TextField value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Ex.: Aluguel" maxLength={80} />
          </Field>
          <Field label="Valor">
            <MoneyField cents={form.cents} onChange={(cents) => setForm({ ...form, cents })} />
          </Field>
          <Field label="Vencimento">
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
