import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import type { Db } from '../db/adapter';
import { BackupFile, backupFileName, exportBackup, parseBackup, serializeBackup } from '../domain/backup';

/** Gera o JSON e abre a planilha de compartilhamento do sistema. */
export async function shareExport(db: Db): Promise<void> {
  const now = new Date();
  const json = serializeBackup(exportBackup(db, now));
  const file = new File(Paths.cache, backupFileName(now));
  file.create({ overwrite: true });
  await file.write(json);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('O compartilhamento não está disponível neste aparelho.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Salvar backup do $pendless',
  });
}

/**
 * Deixa o usuário escolher um arquivo e o valida. Não grava nada.
 * Retorna null se o usuário cancelar; lança erro com mensagem clara se for inválido.
 */
export async function pickBackup(): Promise<BackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  let text: string;
  try {
    text = await new File(result.assets[0].uri).text();
  } catch {
    throw new Error('Não foi possível ler o arquivo escolhido.');
  }
  return parseBackup(text);
}
