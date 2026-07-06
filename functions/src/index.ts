import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

initializeApp();

setGlobalOptions({
  region: 'southamerica-east1',
  maxInstances: 10,
});

/** Health check simples do backend. */
export const ping = onRequest((_req, res) => {
  res.json({ ok: true, service: 'cash-organizer-functions', time: new Date().toISOString() });
});

/**
 * Mantém no documento do mês um total agregado dos gastos variáveis
 * (varActualCached, em centavos), atualizado a cada lançamento criado,
 * alterado ou removido. Útil para consultas/estatísticas sem precisar ler
 * todos os lançamentos.
 */
export const onExpenseWritten = onDocumentWritten(
  'compartments/{compartmentId}/months/{monthId}/expenses/{expenseId}',
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;
    const beforeAmount = before?.exists ? Number(before.data()?.amount ?? 0) : 0;
    const afterAmount = after?.exists ? Number(after.data()?.amount ?? 0) : 0;
    const delta = afterAmount - beforeAmount;
    if (delta === 0) return;

    const { compartmentId, monthId } = event.params;
    await getFirestore()
      .doc(`compartments/${compartmentId}/months/${monthId}`)
      .set({ varActualCached: FieldValue.increment(delta) }, { merge: true });
  },
);
