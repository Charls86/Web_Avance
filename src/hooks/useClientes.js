import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

// Normalizar numeroCliente a 12 dígitos con ceros a la izquierda
const normalizarNumeroCliente = (numero) => {
  if (!numero) return '';
  return numero.toString().replace(/\D/g, '').padStart(12, '0');
};

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClientes = async () => {
    try {
      setLoading(true);

      console.log('Consultando Firestore (con persistencia inteligente)...');

      const [clientesSnapshot, avisosSnapshot] = await Promise.all([
        getDocs(collection(db, 'clientes')),
        getDocs(collection(db, 'avisos'))
      ]);

      console.log(`Fuente de datos: ${clientesSnapshot.metadata.fromCache ? 'CACHÉ LOCAL (Sin costo)' : 'SERVIDOR (Con costo/Deltas)'}`);

      // Crear mapa de avisos para búsqueda rápida
      const avisosMap = {};
      avisosSnapshot.docs.forEach(doc => {
        const data = doc.data();
        avisosMap[doc.id] = data.aviso;
      });

      console.log('Avisos cargados:', Object.keys(avisosMap).length);

      const data = clientesSnapshot.docs.map(doc => {
        const docData = doc.data();
        let fechaRegistro = docData.fechaRegistro;

        // Handle different date formats
        if (fechaRegistro?.toDate) {
          fechaRegistro = fechaRegistro.toDate();
        } else if (fechaRegistro && typeof fechaRegistro === 'string') {
          fechaRegistro = new Date(fechaRegistro);
        }

        // Buscar aviso actualizado en la colección avisos
        const numeroNormalizado = normalizarNumeroCliente(docData.numeroCliente);
        const avisoActualizado = avisosMap[numeroNormalizado];

        return {
          id: doc.id,
          ...docData,
          fechaRegistro,
          // Prioridad: aviso de colección 'avisos' > aviso del registro
          aviso: avisoActualizado || docData.aviso || ''
        };
      });

      // Sort by fechaRegistro descending (nulls at the end)
      data.sort((a, b) => {
        if (!a.fechaRegistro && !b.fechaRegistro) return 0;
        if (!a.fechaRegistro) return 1;
        if (!b.fechaRegistro) return -1;
        return new Date(b.fechaRegistro) - new Date(a.fechaRegistro);
      });

      console.log('Total clientes cargados:', data.length);

      setClientes(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching clientes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Limpiar caché manual antiguo si existe para evitar conflictos
    localStorage.removeItem('clientes_cache');
    localStorage.removeItem('clientes_cache_timestamp');

    fetchClientes();
  }, []);

  return { clientes, loading, error, refetch: fetchClientes };
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

          // Buscar aviso actualizado en la colección avisos
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
            // Prioridad: aviso de colección 'avisos' > aviso del registro
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
