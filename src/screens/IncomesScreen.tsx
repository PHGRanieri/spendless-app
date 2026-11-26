import React, { useMemo, useState } from 'react';
import { Text } from '../components/Text';
import { useApp } from '../AppContext';
import { animateNextLayout } from '../motion';
import { INCOME_TYPES, Recurrence } from '../constants';
import { shortDateLabel } from '../dates';
import { addIncome, deleteIncome, toggleIncomeReceived, updateIncome } from '../domain/items';
import { listIncomes } from '../domain/repo';
import type { EditScope, Income } from '../domain/types';
import { askScope, confirm } from '../components/dialogs';
import { ItemRow } from '../components/ItemRow';
import { Button, DayGrid, Field, FormModal, MoneyField, Segmented, SelectField, TextField } from '../components/ui';
import { colors, common, roles, tints } from '../theme';
import { ListLayout } from './ListLayout';
import { defaultDate, today } from './formDefaults';

interface Form {
  id: number | null;
  type: string | null;
  name: string;
  cents: number;
  date: string;
  recurrence: Recurrence;
  note: string;
}

const RECURRENCE = [
  { key: 'fixa', label: 'Fixa (todo mês)' },
  { key: 'mes', label: 'Só deste mês' },
] as const;

export function IncomesScreen() {
  const { db, month, version, run } = useApp();
  const items = useMemo(() => listIncomes(db, month), [db, month, version]);
  const [form, setForm] = useState<Form | null>(null);
  const editing = items.find((i) => i.id === form?.id) ?? null;

  const received = items.filter((i) => i.received).reduce((a, i) => a + i.amountCents, 0);
  const total = items.reduce((a, i) => a + i.amountCents, 0);

  const openNew = () =>
    setForm({ id: null, type: null, name: '', cents: 0, date: defaultDate(month), recurrence: 'fixa', note: '' });
  const openEdit = (i: Income) =>
    setForm({ id: i.id, type: i.type, name: i.name, cents: i.amountCents, date: i.date, recurrence: i.recurrence, note: i.note ?? '' });

  const save = async () => {
    if (!form) return;
    const input = { type: form.type ?? '', name: form.name, amountCents: form.cents, date: form.date, note: form.note };
    if (form.id == null) {
      if (run(() => { addIncome(db, month, { ...input, recurrence: form.recurrence }, today()); animateNextLayout(); })) setForm(null);
      return;
    }
    let scope: EditScope = 'only_this';
    if (editing?.recurrence === 'fixa') {
      const s = await askScope('editar');
      if (!s) return;
      scope = s;
    }
    if (run(() => updateIncome(db, form.id!, input, scope, today()))) setForm(null);
  };

  const remove = async () => {
    if (!editing) return;
    let scope: EditScope = 'only_this';
    if (editing.recurrence === 'fixa') {
      const s = await askScope('excluir');
      if (!s) return;
      scope = s;
    } else if (!(await confirm('Excluir entrada?', `"${editing.name}" sai deste mês. Isso não pode ser desfeito.`, 'Excluir entrada', true))) {
      return;
    }
    if (run(() => { deleteIncome(db, editing.id, scope); animateNextLayout(); })) setForm(null);
  };

  return (
    <>
      <ListLayout
        doneLabel="Recebido"
        doneCents={received}
        totalCents={total}
        amountColor={roles.incomeText}
        progressBg={tints.green}
        emoji="💰"
        addLabel="+ Nova entrada"
        onAdd={openNew}
        emptyTitle="Nada por aqui ainda 🌱"
        emptyText="Cadastre seu salário e outras entradas para acompanhar o que vai chegar."
        count={items.length}
      >
        {items.map((i) => (
          <ItemRow
            key={i.id}
            type={i.type}
            title={i.name}
            subtitle={`${i.type} · ${i.recurrence === 'fixa' ? 'Fixa' : 'Do mês'} · ${shortDateLabel(i.date)}`}
            cents={i.amountCents}
            amountColor={roles.incomeText}
            done={i.received}
            doneLabel="Recebida"
            pendingLabel="Não recebida"
            onToggle={() => run(() => toggleIncomeReceived(db, i.id))}
            onPress={() => openEdit(i)}
          />
        ))}
      </ListLayout>

      {form && (
        <FormModal
          visible
          title={form.id == null ? 'Nova entrada' : 'Editar entrada'}
          onClose={() => setForm(null)}
          footer={
            <>
              {form.id != null && <Button title="Excluir" variant="danger" onPress={remove} />}
              <Button title="Salvar" onPress={save} />
            </>
          }
        >
          <Field label="Tipo">
            <SelectField value={form.type} options={INCOME_TYPES} onChange={(type) => setForm({ ...form, type })} />
          </Field>
          <Field label="Nome">
            <TextField value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Ex.: Salário empresa" maxLength={80} />
          </Field>
          <Field label="Valor">
            <MoneyField cents={form.cents} onChange={(cents) => setForm({ ...form, cents })} />
          </Field>
          <Field label="Repetição">
            <Segmented
              value={form.recurrence}
              options={RECURRENCE}
              onChange={(recurrence) => setForm({ ...form, recurrence })}
              disabled={form.id != null}
            />
            {form.id != null && <Text style={[common.muted, { marginTop: 6 }]}>A repetição não muda na edição.</Text>}
          </Field>
          <Field label="Data prevista (hoje ou futura)">
            <DayGrid month={month} value={form.date} onChange={(date) => setForm({ ...form, date })} minDate={today()} />
          </Field>
          <Field label="Observação (opcional)">
            <TextField value={form.note} onChangeText={(note) => setForm({ ...form, note })} multiline maxLength={300} />
          </Field>
        </FormModal>
      )}
    </>
  );
}
