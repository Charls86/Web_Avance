import { useState } from 'react';
import { MapPin, Loader2, LogIn, AlertCircle } from 'lucide-react';

export default function Login({ onLoginMicrosoft, onLoginEmail, error, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleMicrosoftLogin = async () => {
    await onLoginMicrosoft();
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (email && password) {
      await onLoginEmail(email, password);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#156082] rounded-2xl mb-4">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Catastro</h1>
          <p className="text-gray-600 mt-1">Ingreso corporativo</p>
        </div>

        {/* Login Container */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="text-center text-sm text-gray-500 mb-4">
              Ingresa con tu cuenta corporativa o correo registrado.
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#156082] focus:border-[#156082] outline-none transition-all"
                  placeholder="usuario@ejemplo.com"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#156082] focus:border-[#156082] outline-none transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full py-2.5 bg-[#156082] text-white rounded-lg font-medium
                         hover:bg-[#114b66] transition-colors
                         disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && email ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Ingresar
                  </>
                )}
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">O ingresa con cuenta corporativa</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <button
              onClick={handleMicrosoftLogin}
              disabled={loading}
              className="w-full py-2.5 bg-[#2F2F2F] text-white rounded-lg font-medium
                       hover:bg-[#1a1a1a] transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && !email ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-0.5 w-4 h-4 mr-1">
                    <div className="bg-[#f25022]"></div>
                    <div className="bg-[#7fba00]"></div>
                    <div className="bg-[#00a4ef]"></div>
                    <div className="bg-[#ffb900]"></div>
                  </div>
                  Iniciar sesión con Microsoft
                </>
              )}
            </button>
            <p className="text-xs text-center text-amber-600 font-medium -mt-2">
              Nota: No logearse, en proceso de implementación
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Gestión de clientes y registros
        </p>
      </div>
    </div>
  );
}
