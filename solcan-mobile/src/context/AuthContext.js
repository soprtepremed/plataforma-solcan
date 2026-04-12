import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión al iniciar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // En este paso, podríamos buscar los datos del empleado en la tabla 'empleados'
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios en la auth
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        fetchProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (sessionUser) => {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (data) {
        setUser({
          id: data.id,
          name: data.nombre,
          role: data.role,
          branch: data.sucursal,
          foto_url: data.foto_url,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, pin) => {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .or(`username.ilike.${username},nombre.ilike.${username}`)
        .eq('pin', pin)
        .maybeSingle();

      if (error || !data) {
        return { success: false, message: 'Usuario o PIN incorrectos' };
      }

      // RESTRICCIÓN DE ROL: Solo permitimos el acceso a mensajeros en la App Mobile
      if (data.role !== 'mensajero') {
        return { success: false, message: 'Acceso denegado: Esta aplicación es exclusiva para el personal de Logística.' };
      }

      const userData = {
        id: data.id,
        name: data.nombre,
        role: data.role,
        branch: data.sucursal,
        foto_url: data.foto_url,
      };

      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const updateAvatar = async (newUrl) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('empleados')
        .update({ foto_url: newUrl })
        .eq('id', user.id);
      
      if (error) throw error;
      setUser(prev => ({ ...prev, foto_url: newUrl }));
    } catch (error) {
      console.error('Error updating avatar in DB:', error);
    }
  };

  const logout = async () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
