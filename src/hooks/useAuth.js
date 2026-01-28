import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, OAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginMicrosoft = async () => {
    try {
      setError(null);
      setLoading(true);

      const provider = new OAuthProvider('microsoft.com');
      const customParams = {
        prompt: "select_account"
      };

      if (import.meta.env.VITE_MICROSOFT_TENANT_ID) {
        customParams.tenant = import.meta.env.VITE_MICROSOFT_TENANT_ID;
      }

      provider.setCustomParameters(customParams);

      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Error de login:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Inicio de sesión cancelado');
      } else {
        setError('Error al iniciar sesión con Microsoft. Verifica tu configuración.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginEmail = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error('Error de login email:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Credenciales incorrectas');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos falidos. Intente más tarde.');
      } else {
        setError('Error al iniciar sesión: ' + err.message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  return { user, loading, error, loginMicrosoft, loginEmail, logout };
}
