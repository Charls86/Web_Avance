import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const clientesRef = collection(db, 'clientes');
      // Get all documents without orderBy to include docs without fechaRegistro
      const snapshot = await getDocs(clientesRef);

      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        let fechaRegistro = docData.fechaRegistro;

        // Handle different date formats
        if (fechaRegistro?.toDate) {
          fechaRegistro = fechaRegistro.toDate();
        } else if (fechaRegistro && typeof fechaRegistro === 'string') {
          fechaRegistro = new Date(fechaRegistro);
        }

        return {
          id: doc.id,
          ...docData,
          fechaRegistro
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
      console.log('Buscando 5769714:', data.find(c => c.numeroCliente === '5769714' || c.numeroCliente === 5769714 || c.id === '5769714'));
      console.log('Primeros 5 numeroCliente:', data.slice(0, 5).map(c => c.numeroCliente));

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
          setCliente({
            id: docSnap.id,
            ...data,
            fechaRegistro: data.fechaRegistro?.toDate?.() || data.fechaRegistro
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
