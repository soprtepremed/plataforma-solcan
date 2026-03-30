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

  const login = async (username, pin) => {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('username', username)
        .eq('pin', pin)
        .single();

      if (error || !data) {
        throw new Error("Usuario o PIN incorrectos");
      }

      const userData = {
        id: data.id,
        name: data.nombre,
        role: data.role,
        branch: data.sucursal,
        username: data.username
      };

      setUser(userData);
      localStorage.setItem('solcan_user', JSON.stringify(userData));
      navigate('/');
      return { success: true };
    } catch (err) {
      console.error("Error en login:", err);
      return { success: false, message: err.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('solcan_user');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
