import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, OAuthProvider, signOut, signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '../services/firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("useAuth: Inicializando observador de autenticación");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("onAuthStateChanged:", user ? "Usuario logueado" : "Sin usuario");
      setUser(user);
      setLoading(false);
    });

    // Verificar resultado de redirección al cargar
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log("Login exitoso tras redirección:", result.user);
          // El usuario se actualizará vía onAuthStateChanged
        } else {
          console.log("getRedirectResult: No hay resultado de redirección (null)");
        }
      })
      .catch((error) => {
        console.error("Error tras redirección:", error);
        if (error.code === 'auth/admin-restricted-operation') {
          setError('⚠️ Acceso denegado: Esta aplicación requiere permisos de administrador en Azure AD. Contacta a TI.');
        } else if (error.code === 'auth/account-exists-with-different-credential') {
          setError('La cuenta ya existe con otro proveedor.');
        } else {
          setError('Error de autenticación: ' + error.message);
        }
        setLoading(false);
      });

    return () => unsubscribe();
  }, []);

  const loginMicrosoft = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log("Iniciando login con Microsoft (Redirect)...");

      // Establecer persistencia local explícitamente
      await setPersistence(auth, browserLocalPersistence);
      console.log("Persistencia establecida a LOCAL");

      const provider = new OAuthProvider('microsoft.com');
      const customParams = {
        prompt: "select_account"
      };

      if (import.meta.env.VITE_MICROSOFT_TENANT_ID) {
        customParams.tenant = import.meta.env.VITE_MICROSOFT_TENANT_ID;
      }

      provider.setCustomParameters(customParams);

      await signInWithRedirect(auth, provider);
      // La página se recargará, no necesitamos esperar nada más aquí
    } catch (err) {
      console.error('Error iniciando login:', err);
      setError('No se pudo iniciar la redirección de login: ' + err.message);
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
