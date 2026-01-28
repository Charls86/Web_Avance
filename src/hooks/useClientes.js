import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, Timestamp, getDocsFromCache, getDocsFromServer } from 'firebase/firestore';
import { db } from '../services/firebase';

// Normalizar numeroCliente a 12 dígitos con ceros a la izquierda
const normalizarNumeroCliente = (numero) => {
  if (!numero) return '';
  return numero.toString().replace(/\D/g, '').padStart(12, '0');
};

// Keys para guardar timestamps
const LAST_SYNC_KEY = 'clientes_last_sync';
const LAST_FULL_SYNC_KEY = 'clientes_last_full_sync';
const FULL_SYNC_INTERVAL_HOURS = 24; // Sincronización completa cada 24 horas
const SYNC_VERSION_KEY = 'clientes_sync_version';
const SYNC_VERSION = '2';

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Referencias para mantener datos en memoria
  const clientesMapRef = useRef(new Map());
  const avisosMapRef = useRef({});

  // Procesar y ordenar clientes
  const processAndSetClientes = () => {
    const avisosMap = avisosMapRef.current;

    const data = Array.from(clientesMapRef.current.values()).map(docData => {
      let fechaRegistro = docData.fechaRegistro;

      if (fechaRegistro?.toDate) {
        fechaRegistro = fechaRegistro.toDate();
      } else if (fechaRegistro && typeof fechaRegistro === 'string') {
        fechaRegistro = new Date(fechaRegistro);
      }

      const numeroNormalizado = normalizarNumeroCliente(docData.numeroCliente);
      const avisoActualizado = avisosMap[numeroNormalizado];

      return {
        ...docData,
        fechaRegistro,
        aviso: avisoActualizado || docData.aviso || ''
      };
    });

    // Ordenar por fecha descendente
    data.sort((a, b) => {
      if (!a.fechaRegistro && !b.fechaRegistro) return 0;
      if (!a.fechaRegistro) return 1;
      if (!b.fechaRegistro) return -1;
      return new Date(b.fechaRegistro) - new Date(a.fechaRegistro);
    });

    // Filtrar duplicados por numeroCliente (manteniendo el más reciente)
    const uniqueMap = new Map();
    data.forEach(client => {
      const key = normalizarNumeroCliente(client.numeroCliente);
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, client);
      } else if (!key) {
        // Si no tiene numeroCliente, usar ID para mantenerlo si es necesario
        uniqueMap.set(client.id, client);
      }
    });

    const uniqueData = Array.from(uniqueMap.values());
    console.log(`Clientes procesados: ${data.length} -> Únicos: ${uniqueData.length}`);
    setClientes(uniqueData);
  };

  // Carga inicial: intenta caché primero, luego servidor
  const initialLoad = async () => {
    try {
      setLoading(true);
      console.log('Carga inicial...');

      const syncVersion = localStorage.getItem(SYNC_VERSION_KEY);
      if (syncVersion !== SYNC_VERSION) {
        localStorage.removeItem(LAST_SYNC_KEY);
        localStorage.setItem(SYNC_VERSION_KEY, SYNC_VERSION);
      }

      // Intentar cargar desde caché primero para renderizado rápido (Stale-while-revalidate)
      try {
        const [clientesCacheSnap, avisosCacheSnap] = await Promise.all([
          getDocsFromCache(collection(db, 'clientes')),
          getDocsFromCache(collection(db, 'avisos'))
        ]);

        if (clientesCacheSnap.docs.length > 0) {
          console.log(`Vista previa desde caché: ${clientesCacheSnap.docs.length} clientes`);

          avisosCacheSnap.docs.forEach(doc => {
            avisosMapRef.current[doc.id] = doc.data().aviso;
          });

          clientesCacheSnap.docs.forEach(doc => {
            clientesMapRef.current.set(doc.id, {
              id: doc.id,
              ...doc.data()
            });
          });

          processAndSetClientes();
        }
      } catch (cacheErr) {
        console.log('Caché no disponible o vacío, continuando...');
      }

      // SIEMPRE realizar sincronización completa con el servidor al inicio
      // para asegurar consistencia total de datos.
      await fullSync();

    } catch (err) {
      console.error('Error en carga inicial:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Sincronización completa (primera vez)
  const fullSync = async () => {
    console.log('Sincronización completa desde servidor...');

    const [clientesSnap, avisosSnap] = await Promise.all([
      getDocsFromServer(collection(db, 'clientes')),
      getDocsFromServer(collection(db, 'avisos'))
    ]);

    console.log(`✓ Servidor: ${clientesSnap.docs.length} clientes, ${avisosSnap.docs.length} avisos`);
    console.log(`  (Costo: ${clientesSnap.docs.length + avisosSnap.docs.length} lecturas)`);

    avisosMapRef.current = {};
    clientesMapRef.current.clear();

    avisosSnap.docs.forEach(doc => {
      avisosMapRef.current[doc.id] = doc.data().aviso;
    });

    clientesSnap.docs.forEach(doc => {
      clientesMapRef.current.set(doc.id, {
        id: doc.id,
        ...doc.data()
      });
    });

    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    processAndSetClientes();
    setLoading(false);
    setError(null);
  };

  // BOTÓN ACTUALIZAR: solo trae docs nuevos desde última sync
  const refetch = async () => {
    try {
      const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY);

      if (!lastSyncStr) {
        console.log('Sin timestamp previo, sincronización completa...');
        await fullSync();
        return;
      }

      console.log('Buscando actualizaciones...');

      // Para asegurar integridad, traemos todo lo nuevo
      // Usaremos la fecha de última sync menos un pequeño buffer (5 min) para evitar perder datos por latencia
      const lastSync = new Date(lastSyncStr);
      lastSync.setMinutes(lastSync.getMinutes() - 5);
      const lastSyncTimestamp = Timestamp.fromDate(lastSync);

      console.log(`Fecha corte búsqueda: ${lastSync.toLocaleString()}`);

      const newClientsQuery = query(
        collection(db, 'clientes'),
        where('fechaRegistro', '>', lastSyncTimestamp)
      );

      // Restauramos soporte para fechas en formato String (ISO)
      // Convertimos lastSync a string ISO para la comparación
      const lastSyncISO = lastSync.toISOString();
      const newClientsStringQuery = query(
        collection(db, 'clientes'),
        where('fechaRegistro', '>', lastSyncISO)
      );

      const [newClientsSnap, newClientsStringSnap, avisosSnap] = await Promise.all([
        getDocs(newClientsQuery),
        getDocs(newClientsStringQuery),
        getDocsFromCache(collection(db, 'avisos')).catch(() => null)
      ]);

      const newClientsMap = new Map();

      // Merge results from both queries
      newClientsSnap.docs.forEach(doc => {
        newClientsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      newClientsStringSnap.docs.forEach(doc => {
        if (!newClientsMap.has(doc.id)) {
          newClientsMap.set(doc.id, { id: doc.id, ...doc.data() });
        }
      });

      const newClientsDocs = Array.from(newClientsMap.values());

      if (avisosSnap) {
        avisosMapRef.current = {};
        avisosSnap.docs.forEach(doc => {
          avisosMapRef.current[doc.id] = doc.data().aviso;
        });
      }

      if (newClientsDocs.length > 0) {
        console.log(`OK ${newClientsDocs.length} registros nuevos encontrados`);

        newClientsDocs.forEach(data => {
          clientesMapRef.current.set(data.id, data);
        });

        processAndSetClientes();
        // Solo actualizamos la fecha de sync si encontramos algo, 
        // o si queremos confirmar que "hasta aquí todo OK"
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      } else {
        console.log('No se encontraron nuevos registros.');
        // Forzamos "refrescar" la vista aunque no haya datos nuevos,
        // por si hubo cambios en memoria o filtros
        processAndSetClientes();
      }

      setError(null);

    } catch (err) {
      console.error('Error en actualización:', err);
      // Si falla la actualización parcial, intentar full sync como fallback
      console.log('Intentando sincronización completa de emergencia...');
      await fullSync();
    }
  };

  useEffect(() => {
    initialLoad();
  }, []);

  return { clientes, loading, error, refetch };
}

export function useClienteById(id) {
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setCliente(null);
      setLoading(false);
      return;
    }

    const fetchCliente = async () => {
      try {
        setLoading(true);
        const { doc, getDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'clientes', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          let avisoActualizado = null;
          if (data.numeroCliente) {
            const numeroNormalizado = normalizarNumeroCliente(data.numeroCliente);
            const avisoRef = doc(db, 'avisos', numeroNormalizado);
            const avisoSnap = await getDoc(avisoRef);
            if (avisoSnap.exists()) {
              avisoActualizado = avisoSnap.data().aviso;
            }
          }

          setCliente({
            id: docSnap.id,
            ...data,
            fechaRegistro: data.fechaRegistro?.toDate?.() || data.fechaRegistro,
            aviso: avisoActualizado || data.aviso || ''
          });
        } else {
          setCliente(null);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching cliente:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCliente();
  }, [id]);

  return { cliente, loading, error };
}
