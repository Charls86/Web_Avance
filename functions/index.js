const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

initializeApp();

// Convertir Timestamp de Firestore a ISO string para RTDB
const convertTimestamp = (value) => {
  if (!value) return null;
  if (value.toDate) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

// Limpiar objeto para RTDB (no acepta undefined)
const cleanForRTDB = (obj) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (value && typeof value === "object" && value.toDate) {
        cleaned[key] = convertTimestamp(value);
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        cleaned[key] = cleanForRTDB(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

// ==========================================
// SYNC: Firestore clientes → Realtime Database
// ==========================================

// Cuando se CREA un cliente en Firestore
exports.onClienteCreated = onDocumentCreated("clientes/{clienteId}", async (event) => {
  const clienteId = event.params.clienteId;
  const data = event.data.data();

  console.log(`[SYNC] Nuevo cliente: ${clienteId}`);

  try {
    const rtdb = getDatabase();
    await rtdb.ref(`clientes/${clienteId}`).set(cleanForRTDB(data));
    console.log(`[SYNC] Cliente ${clienteId} sincronizado a RTDB`);
  } catch (error) {
    console.error(`[SYNC] Error sincronizando cliente ${clienteId}:`, error);
  }
});

// Cuando se ACTUALIZA un cliente en Firestore
exports.onClienteUpdated = onDocumentUpdated("clientes/{clienteId}", async (event) => {
  const clienteId = event.params.clienteId;
  const newData = event.data.after.data();

  console.log(`[SYNC] Cliente actualizado: ${clienteId}`);

  try {
    const rtdb = getDatabase();
    await rtdb.ref(`clientes/${clienteId}`).update(cleanForRTDB(newData));
    console.log(`[SYNC] Cliente ${clienteId} actualizado en RTDB`);
  } catch (error) {
    console.error(`[SYNC] Error actualizando cliente ${clienteId}:`, error);
  }
});

// Cuando se ELIMINA un cliente en Firestore
exports.onClienteDeleted = onDocumentDeleted("clientes/{clienteId}", async (event) => {
  const clienteId = event.params.clienteId;

  console.log(`[SYNC] Cliente eliminado: ${clienteId}`);

  try {
    const rtdb = getDatabase();
    await rtdb.ref(`clientes/${clienteId}`).remove();
    console.log(`[SYNC] Cliente ${clienteId} eliminado de RTDB`);
  } catch (error) {
    console.error(`[SYNC] Error eliminando cliente ${clienteId}:`, error);
  }
});

// ==========================================
// SYNC: Firestore avisos → Realtime Database
// ==========================================

// Cuando se CREA un aviso en Firestore
exports.onAvisoCreated = onDocumentCreated("avisos/{avisoId}", async (event) => {
  const avisoId = event.params.avisoId;
  const data = event.data.data();

  console.log(`[SYNC] Nuevo aviso: ${avisoId}`);

  try {
    const rtdb = getDatabase();
    await rtdb.ref(`avisos/${avisoId}`).set(cleanForRTDB(data));
    console.log(`[SYNC] Aviso ${avisoId} sincronizado a RTDB`);
  } catch (error) {
    console.error(`[SYNC] Error sincronizando aviso ${avisoId}:`, error);
  }
});

// Cuando se ACTUALIZA un aviso en Firestore
exports.onAvisoUpdated = onDocumentUpdated("avisos/{avisoId}", async (event) => {
  const avisoId = event.params.avisoId;
  const newData = event.data.after.data();

  console.log(`[SYNC] Aviso actualizado: ${avisoId}`);

  try {
    const rtdb = getDatabase();
    await rtdb.ref(`avisos/${avisoId}`).update(cleanForRTDB(newData));
    console.log(`[SYNC] Aviso ${avisoId} actualizado en RTDB`);
  } catch (error) {
    console.error(`[SYNC] Error actualizando aviso ${avisoId}:`, error);
  }
});

// Cuando se ELIMINA un aviso en Firestore
exports.onAvisoDeleted = onDocumentDeleted("avisos/{avisoId}", async (event) => {
  const avisoId = event.params.avisoId;

  console.log(`[SYNC] Aviso eliminado: ${avisoId}`);

  try {
    const rtdb = getDatabase();
    await rtdb.ref(`avisos/${avisoId}`).remove();
    console.log(`[SYNC] Aviso ${avisoId} eliminado de RTDB`);
  } catch (error) {
    console.error(`[SYNC] Error eliminando aviso ${avisoId}:`, error);
  }
});
