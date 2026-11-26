import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';
import { Text } from './src/components/Text';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { FONT_FILES, setFontsReady } from './src/fonts';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, errorMessage, useApp } from './src/AppContext';
import { openAppDb } from './src/db/expoAdapter';
import type { Db } from './src/db/adapter';
import { createMonth, CreateMonthResult, ensureInitialMonth, runAutoCreate } from './src/domain/months';
import { MonthOrigin } from './src/domain/types';
import { monthLabel } from './src/dates';
import { shareExport } from './src/services/backupIO';
import { Header } from './src/components/Header';
import { DialogHost } from './src/components/DialogHost';
import { showDialog } from './src/components/dialogs';
import { TabBar, TabKey } from './src/components/TabBar';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { IncomesScreen } from './src/screens/IncomesScreen';
import { FixedExpensesScreen } from './src/screens/FixedExpensesScreen';
import { VariableExpensesScreen } from './src/screens/VariableExpensesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors, space } from './src/theme';

type Opened = { db: Db; error: null } | { db: null; error: string };

function openDb(): Opened {
  try {
    const db = openAppDb();
    ensureInitialMonth(db, new Date());
    return { db, error: null };
  } catch (e) {
    return { db: null, error: errorMessage(e) };
  }
}

export default function App() {
  const [opened] = useState(openDb);
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  // Se a fonte falhar, o app segue com a fonte do sistema (nunca bloqueia o acesso aos dados).
  setFontsReady(fontsLoaded && !fontError);
  if (!fontsLoaded && !fontError) return <View style={styles.root} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {opened.db ? (
        <AppProvider db={opened.db}>
          <Main />
          <DialogHost />
        </AppProvider>
      ) : (
        <SafeAreaView style={styles.center}>
          <Text style={styles.errorTitle}>Não foi possível abrir os dados</Text>
          <Text style={styles.errorText}>{opened.error}</Text>
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}

function Main() {
  const { db, refresh, setMonth } = useApp();
  const [tab, setTab] = useState<TabKey>('resumo');
  const dialogOpen = useRef(false);

  /**
   * Trata o resultado de uma criação de mês. Se o histórico estiver cheio,
   * pergunta antes de remover o mês mais antigo, oferecendo exportar antes.
   * Cancelar = nada muda.
   */
  const handleCreate = useCallback(
    (month: string, origin: MonthOrigin, result: CreateMonthResult | null) => {
      if (!result) return;
      if (result.status === 'created') {
        refresh();
        if (origin === 'manual') setMonth(month);
        return;
      }
      if (result.status !== 'needs_confirmation' || dialogOpen.current) return;

      dialogOpen.current = true;
      const removing = result.toRemove.map(monthLabel).join(', ');
      const ask = async (): Promise<void> => {
        const choice = await showDialog({
          emoji: '📦',
          tone: 'danger',
          title: 'Histórico cheio',
          message:
            `O $pendless guarda até 12 meses. Para criar ${monthLabel(month)}, ` +
            `${removing} será removido com todos os itens.\n\nQuer exportar seus dados antes?`,
          actions: [
            { key: 'export', label: 'Exportar antes', style: 'primary' },
            { key: 'remove', label: `Remover ${removing} e criar`, style: 'danger-outline' },
            { key: 'cancel', label: 'Agora não', style: 'cancel' },
          ],
        });
        if (choice === 'export') {
          try {
            await shareExport(db);
          } catch (e) {
            Alert.alert('Não foi possível exportar', errorMessage(e));
          }
          return ask(); // volta a perguntar depois de exportar
        }
        dialogOpen.current = false;
        if (choice !== 'remove') return; // cancelar = nada muda
        try {
          const r = createMonth(db, month, origin, { now: new Date(), confirmRemoval: true });
          handleCreate(month, origin, r);
        } catch (e) {
          Alert.alert('Não foi possível criar o mês', errorMessage(e));
        }
      };
      void ask();
    },
    [db, refresh, setMonth],
  );

  // Criação automática: ao abrir e ao voltar para o primeiro plano (sem tarefa em segundo plano).
  useEffect(() => {
    const check = () => {
      try {
        const now = new Date();
        const r = runAutoCreate(db, now);
        if (r) handleCreate(r.month, 'auto', r);
      } catch (e) {
        Alert.alert('Não foi possível criar o próximo mês', errorMessage(e));
      }
    };
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [db, handleCreate]);

  const createNext = (month: string) => {
    try {
      handleCreate(month, 'manual', createMonth(db, month, 'manual', { now: new Date() }));
    } catch (e) {
      Alert.alert('Não foi possível criar o mês', errorMessage(e));
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <Header onCreateNext={createNext} />
      <View style={styles.body}>
        {tab === 'resumo' && <SummaryScreen />}
        {tab === 'entradas' && <IncomesScreen />}
        {tab === 'fixos' && <FixedExpensesScreen />}
        {tab === 'variaveis' && <VariableExpensesScreen />}
        {tab === 'ajustes' && <SettingsScreen />}
      </View>
      <TabBar active={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: colors.background },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.expense, marginBottom: space.sm },
  errorText: { fontSize: 14, color: colors.text, textAlign: 'center' },
});
