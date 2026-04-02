import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';
import styles from './TopNavbar.module.css';

export default function TopNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Pedir permiso para notificaciones nativas al cargar
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Suscripción en tiempo real a notificaciones
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .or(`role.eq.${user.role},user_id.eq.${user.id},metadata->>sucursal.eq."${user.branch}"`)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setNotifications(data);
    };

    fetchNotifications();

    const channel = supabase
      .channel('notificaciones_realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notificaciones' 
      }, (payload) => {
        const nuevo = payload.new;
        // Filtrar si es para mi rol, mi ID o mi sucursal
        const isForMe = nuevo.role === user.role || 
                        nuevo.user_id === user.id || 
                        (nuevo.metadata && nuevo.metadata.sucursal === user.branch);

        if (isForMe) {
          setNotifications(prev => [nuevo, ...prev].slice(0, 10));
          
          // Notificación Nativa mediante Service Worker (VITAL para móvil)
          if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification(nuevo.title, {
                body: nuevo.message,
                icon: '/favicon.png',
                vibrate: [200, 100, 200],
                tag: 'solcan-' + nuevo.id, // Evita duplicados
                renotify: true
              });
            });
          }

          // Sonido de campana - Ejecución rápida
          playDing();
        }
      })
      .subscribe({
        onStatus: (status) => {
          if (status === 'SUBSCRIBED') console.log('📡 Realtime de Solcan Conectado');
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const playDing = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'triangle'; // Sonido más penetrante que 'sine' para ambientes operativos
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime); 
      
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02); // Más volumen
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (err) {
      console.warn("Audio blocked:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    await supabase.from('notificaciones')
      .update({ read: true })
      .eq('read', false)
      .or(`role.eq.${user.role},user_id.eq.${user.id},metadata->>sucursal.eq."${user.branch}"`);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Lógica Dinámica de Roles (Fase 3)
  const getMenuOptions = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      return [
        { label: 'Auditoría Global', path: '/logistica/admin' },
        { label: 'Bitácora FO-DO-017', path: '/logistica/bitacora' },
        { label: 'Recepción Lab', path: '/logistica/recepcion' },
        { label: 'Captura PDF', path: '/captura' },
        { label: 'Historial', path: '/resultados' }
      ];
    } else if (user.role === 'captura') {
      return [
        { label: 'Subir Resultados', path: '/captura' },
        { label: 'Historial', path: '/resultados' }
      ];
    } else if (user.role === 'quimico') {
      return [
        { label: 'Recepción Matriz', path: '/logistica/recepcion' },
        { label: 'Bitácora FO-DO-017', path: '/logistica/bitacora' },
        { label: 'Materiales', path: '/logistica/materiales' }
      ];
    } else if (user.role === 'recepcion') {
      return [
        { label: 'Preparar Envío', path: '/logistica/envio' },
        { label: 'Mi Bitácora', path: '/logistica/bitacora' },
        { label: 'Estado Sede', path: '/logistica/sede' }
      ];
    } else if (user.role === 'mensajero') {
      return [
        { label: 'Ruta de Transporte', path: '/logistica/transporte' }
      ];
    }
    return [];
  };

  const menuOptions = getMenuOptions();

  return (
    <nav className={styles.navbarContainer}>
      {/* Nivel 1: Accesos secundarios y Portal */}
      <div className={styles.topStripe}>
        <div className={styles.stripeLinks}>
          {/* Se eliminaron enlaces secundarios */}
        </div>
      </div>

      {/* Nivel 2: Barra principal blanca */}
      <div className={styles.mainNav}>
        {/* Componente Logo a la Izquierda */}
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <Logo size="md" />
        </div>

        {/* Enlaces al Centro (Ocultos en móvil) */}
        <div className={styles.navLinks}>
          {menuOptions.map((opt, i) => (
            <div key={i} className={styles.navItem} onClick={() => navigate(opt.path)}>
              {opt.label}
            </div>
          ))}
        </div>

        {/* Área de Usuario a la Derecha */}
        <div className={styles.userArea}>
          {/* Nombre Usuario Corto y Sucursal */}
          <div className={styles.userProfileWrapper}>
            <span style={{ fontSize: '0.80rem', fontWeight: 600, marginRight: '10px' }} className={styles.stripeLinks}>
              Hola, {user?.name?.startsWith('Q.F.B.') ? user.name : user?.name?.split(' ')[0]} 
              <span style={{ color: 'var(--co-accent)', marginLeft: '8px', paddingLeft: '8px', borderLeft: '1.5px solid #E2E8F0' }}>
                📍 {user?.branch}
              </span>
            </span>
            <div className={styles.avatarCircle} onClick={() => document.getElementById('avatar-upload').click()}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              <input 
                type="file" 
                id="avatar-upload" 
                hidden 
                accept="image/*" 
                onChange={(e) => alert('Funcionalidad de carga de imagen en desarrollo. Pronto podrás ver tu foto aquí.')}
              />
            </div>
          </div>
          <span className={`material-symbols-rounded ${styles.iconBtn}`}>
            search
          </span>
          <div className={styles.notificationWrapper}>
            <span 
              className={`material-symbols-rounded ${styles.iconBtn} ${unreadCount > 0 ? styles.hasUnread : ''}`}
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) markAllAsRead();
              }}
            >
              notifications
              {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </span>

            {showNotifications && (
              <div className={styles.notificationDropdown}>
                <div className={styles.notifHeader}>
                  <h4>Notificaciones</h4>
                  <button onClick={() => setShowNotifications(false)}>×</button>
                </div>
                <div className={styles.notifList}>
                  {notifications.length === 0 ? (
                    <div className={styles.emptyNotif}>No tienes notificaciones</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`${styles.notifItem} ${!n.read ? styles.unreadItem : ''}`}>
                        <div className={styles.notifDot}></div>
                        <div className={styles.notifContent}>
                          <p className={styles.notifTitle}>{n.title}</p>
                          <p className={styles.notifBody}>{n.message}</p>
                          <span className={styles.notifTime}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <span 
            className={`material-symbols-rounded ${styles.iconBtn}`} 
            title="Cerrar Sesión" 
            onClick={logout}
          >
            logout
          </span>
          
          {/* Botón de Menú Móvil */}
          <span 
            className={`material-symbols-rounded ${styles.iconBtn} ${styles.mobileMenuBtn}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </div>
      </div>

      {/* Nivel 3: Overlay (Menú responsivo para celular/Tablet) */}
      <div className={`${styles.mobileDropdown} ${mobileMenuOpen ? styles.open : styles.closed}`}>
        {menuOptions.map((opt, i) => (
          <div 
            key={`mob-${i}`} 
            className={styles.navItem} 
            onClick={() => {
              navigate(opt.path);
              setMobileMenuOpen(false);
            }}
          >
            {opt.label}
          </div>
        ))}
        {/* Opción de Cierre de Sesión en Móvil Tamién */}
        <div 
          className={styles.navItem} 
          style={{ color: 'var(--co-accent)', marginTop: '1rem' }}
          onClick={() => { logout(); setMobileMenuOpen(false); }}
        >
          <strong>Cerrar Sesión</strong>
        </div>
      </div>
    </nav>
  );
}
