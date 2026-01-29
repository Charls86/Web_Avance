import { useState, useEffect, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../services/firebase';

// Normalizar numeroCliente a 12 dígitos con ceros a la izquierda
const normalizarNumeroCliente = (numero) => {
  if (!numero) return '';
  return numero.toString().replace(/\D/g, '').padStart(12, '0');
};

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const avisosRef = useRef({});

  // Procesar datos de Realtime Database
  const processData = (clientesData, avisosData) => {
    // Guardar avisos en ref
    avisosRef.current = avisosData || {};

    if (!clientesData) {
      setClientes([]);
      setLoading(false);
      return;
    }

    // Convertir objeto a array
    const data = Object.entries(clientesData).map(([id, docData]) => {
      let fechaRegistro = docData.fechaRegistro;

      // Convertir fecha si es string
      if (fechaRegistro && typeof fechaRegistro === 'string') {
        fechaRegistro = new Date(fechaRegistro);
      } else if (fechaRegistro && typeof fechaRegistro === 'number') {
        fechaRegistro = new Date(fechaRegistro);
      }

      const numeroNormalizado = normalizarNumeroCliente(docData.numeroCliente);
      const avisoActualizado = avisosRef.current[numeroNormalizado];

      return {
        id,
        ...docData,
        fechaRegistro,
        aviso: avisoActualizado?.aviso || docData.aviso || ''
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
        uniqueMap.set(client.id, client);
      }
    });

    const uniqueData = Array.from(uniqueMap.values());
    console.log(`[RTDB] Clientes: ${data.length} -> Únicos: ${uniqueData.length} (sin costo por lectura)`);
    setClientes(uniqueData);
    setLoading(false);
    setError(null);
  };

  useEffect(() => {
    console.log('[RTDB] Iniciando listeners en tiempo real...');
    setLoading(true);

    const clientesDbRef = ref(rtdb, 'clientes');
    const avisosDbRef = ref(rtdb, 'avisos');

    let clientesData = null;
    let avisosData = null;
    let clientesLoaded = false;
    let avisosLoaded = false;

    // Listener para clientes - se actualiza automáticamente
    const clientesUnsubscribe = onValue(clientesDbRef, (snapshot) => {
      clientesData = snapshot.val();
      clientesLoaded = true;
      console.log(`[RTDB] Clientes recibidos: ${clientesData ? Object.keys(clientesData).length : 0}`);

      if (avisosLoaded) {
        processData(clientesData, avisosData);
      }
    }, (err) => {
      console.error('[RTDB] Error en clientes:', err);
      setError(err.message);
      setLoading(false);
    });

    // Listener para avisos
    const avisosUnsubscribe = onValue(avisosDbRef, (snapshot) => {
      avisosData = snapshot.val();
      avisosLoaded = true;
      console.log(`[RTDB] Avisos recibidos: ${avisosData ? Object.keys(avisosData).length : 0}`);

      if (clientesLoaded) {
        processData(clientesData, avisosData);
      }
    }, (err) => {
      console.error('[RTDB] Error en avisos:', err);
      // No es crítico si avisos falla
      avisosLoaded = true;
      if (clientesLoaded) {
        processData(clientesData, {});
      }
    });

    // Cleanup: desuscribirse cuando el componente se desmonta
    return () => {
      console.log('[RTDB] Limpiando listeners...');
      off(clientesDbRef);
      off(avisosDbRef);
    };
  }, []);

  // refetch ahora es innecesario (datos en tiempo real), pero mantenemos la interfaz
  const refetch = () => {
    console.log('[RTDB] Los datos se actualizan automáticamente en tiempo real');
  };

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

    console.log(`[RTDB] Cargando cliente: ${id}`);
    setLoading(true);

    const clienteRef = ref(rtdb, `clientes/${id}`);

    const unsubscribe = onValue(clienteRef, async (snapshot) => {
      const data = snapshot.val();

      if (data) {
        let avisoActualizado = null;

        // Buscar aviso si tiene numeroCliente
        if (data.numeroCliente) {
          const numeroNormalizado = normalizarNumeroCliente(data.numeroCliente);
          const avisoDbRef = ref(rtdb, `avisos/${numeroNormalizado}`);

          onValue(avisoDbRef, (avisoSnap) => {
            const avisoData = avisoSnap.val();
            if (avisoData) {
              avisoActualizado = avisoData.aviso;
            }
          }, { onlyOnce: true });
        }

        let fechaRegistro = data.fechaRegistro;
        if (fechaRegistro && typeof fechaRegistro === 'string') {
          fechaRegistro = new Date(fechaRegistro);
        } else if (fechaRegistro && typeof fechaRegistro === 'number') {
          fechaRegistro = new Date(fechaRegistro);
        }

        setCliente({
          id,
          ...data,
          fechaRegistro,
          aviso: avisoActualizado || data.aviso || ''
        });
      } else {
        setCliente(null);
      }
      setError(null);
      setLoading(false);
    }, (err) => {
      console.error('[RTDB] Error fetching cliente:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => off(clienteRef);
  }, [id]);

  return { cliente, loading, error };
}
