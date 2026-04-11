import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Intentar recuperar el usuario guardado
    const savedUser = localStorage.getItem('solcan_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const navigate = useNavigate();

  const login = async (usernameInput, pinInput, isMatrixAccess = false, selectedBranch = "", selectedRole = "") => {
    const username = usernameInput ? usernameInput.trim() : "";
    const pin = pinInput ? pinInput.trim() : "";
    
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .or(`username.ilike."${username}",nombre.ilike."${username}"`)
        .eq('pin', pin)
        .maybeSingle();

      if (error || !data) {
        throw new Error("Usuario o PIN incorrectos");
      }

      const userData = {
        id: data.id,
        name: data.nombre,
        role: selectedRole || data.role,
        branch: isMatrixAccess ? "Tuxtla Gutierrez" : (selectedBranch || data.sucursal),
        sucursal: isMatrixAccess ? "Tuxtla Gutierrez" : (selectedBranch || data.sucursal),
        username: data.username,
        foto_url: data.foto_url
      };

      setUser(userData);
      localStorage.setItem('solcan_user', JSON.stringify(userData));
      navigate('/');
      return { success: true };
    } catch (err) {
      console.error("Error en login:", err);
      return { success: false, message: "Credenciales incorrectas. Verifica tu usuario y PIN." };
    }
  };

  const updateUser = (newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('solcan_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('solcan_user');
    navigate('/login');
  };

  // Lógica de Inactividad (4 minutos)
  useEffect(() => {
    if (!user) return;

    let timeoutId;
    const TIMEOUT_MS = 900000; // 15 minutos (Aumentado para estabilidad en pruebas)

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.warn("Sesión cerrada por inactividad (4 minutos)");
        logout();
      }, TIMEOUT_MS);
    };

    // Eventos que representan "actividad"
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    // Registrar escuchadores
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Iniciar el conteo inicial
    resetTimer();

    // Limpieza al desmontar o cambiar de usuario
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
