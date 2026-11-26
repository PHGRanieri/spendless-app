import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { errorMessage, useApp } from '../AppContext';
import { importBackup, summarizeBackup } from '../domain/backup';
import { monthShortLabel } from '../dates';
import { pickBackup, shareExport } from '../services/backupIO';
import { confirm, notify } from '../components/dialogs';
import { Button } from '../components/ui';
import { common, space, tints } from '../theme';
import { MAX_MONTHS } from '../constants';

export function SettingsScreen() {
  const { db, refresh } = useApp();
  const [busy, setBusy] = useState(false);

  const doExport = async () => {
    setBusy(true);
    try {
      await shareExport(db);
    } catch (e) {
      await notify('error', 'Não foi possível exportar', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const backup = await pickBackup(); // valida schema e versão; não grava nada
      if (!backup) return;
      const s = summarizeBackup(backup);
      const range = s.months > 0 ? ` (${monthShortLabel(s.monthIds[0])} a ${monthShortLabel(s.monthIds[s.months - 1])})` : '';
      const ok = await confirm(
        'Importar backup',
        `O arquivo tem ${s.months} ${s.months === 1 ? 'mês' : 'meses'}${range} e ${s.items} ${s.items === 1 ? 'item' : 'itens'}.\n\n` +
          'Todos os dados atuais serão substituídos pelos do arquivo.',
        'Substituir dados',
        true,
        '📥',
      );
      if (!ok) return;
      importBackup(db, backup); // uma única transação: falhou = nada muda
      refresh();
      await notify('success', 'Importação concluída', 'Os dados do arquivo foram restaurados.');
    } catch (e) {
      await notify('error', 'Importação cancelada', `${errorMessage(e)}\n\nSeus dados atuais não foram alterados.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[common.card, styles.block]}>
        <View style={styles.head}>
          <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[styles.icon, { backgroundColor: tints.green }]}><Text style={styles.emoji}>📤</Text></View>
          <Text style={common.title}>Exportar dados</Text>
        </View>
        <Text style={common.muted}>
          Gera um arquivo JSON com todos os meses e itens, incluindo os status, e abre o compartilhamento para salvar em
          Arquivos, Drive etc.
        </Text>
        <View style={styles.action}>
          <Button title="Exportar" onPress={doExport} disabled={busy} />
        </View>
      </View>

      <View style={[common.card, styles.block]}>
        <View style={styles.head}>
          <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[styles.icon, { backgroundColor: tints.amber }]}><Text style={styles.emoji}>📥</Text></View>
          <Text style={common.title}>Importar dados</Text>
        </View>
        <Text style={common.muted}>
          Escolha um arquivo exportado pelo $pendless. Antes de substituir, o app valida o arquivo e mostra um resumo
          para você confirmar. Se algo der errado, seus dados atuais continuam intactos.
        </Text>
        <View style={styles.action}>
          <Button title="Importar" variant="secondary" onPress={doImport} disabled={busy} />
        </View>
      </View>

      <Text style={[common.muted, { textAlign: 'center' }]}>
        🔒 Seus dados ficam só neste aparelho.{'\n'}O histórico guarda até {MAX_MONTHS} meses.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  block: { marginBottom: space.lg, gap: space.sm },
  action: { flexDirection: 'row', marginTop: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
});
