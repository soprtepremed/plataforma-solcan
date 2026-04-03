import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';
import Cropper from 'react-easy-crop';
import styles from './TopNavbar.module.css';

export default function TopNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Cropper states
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleAvatarUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageToCrop(reader.result));
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    return new Promise((resolve) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 150; // Final size
        canvas.height = 150;

        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          150,
          150
        );
        canvas.toBlob((blob) => resolve(blob), 'image/png', 0.85);
      };
    });
  };

  const confirmUpload = async () => {
    if (!croppedAreaPixels || !imageToCrop) return;
    
    setUploading(true);
    setImageToCrop(null); // Close modal

    try {
      console.log('🚀 Iniciando procesamiento de imagen...');
      const blob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const fileName = `${user.id}-${Date.now()}.png`;
      const filePath = `${fileName}`;

      console.log('📤 Subiendo a Supabase Storage (avatars)...');
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { 
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Error Storage:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('🔗 URL Pública:', publicUrl);

      const { error: dbError } = await supabase
        .from('empleados')
        .update({ foto_url: publicUrl })
        .eq('id', user.id);

      if (dbError) {
        console.error('❌ Error DB:', dbError);
        throw dbError;
      }

      console.log('✅ Perfil actualizado.');
      updateUser({ foto_url: publicUrl });
    } catch (error) {
      console.error('💣 Error final:', error);
      alert('Error al actualizar foto: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploading(false);
    }
  };

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
      
      const playNote = (freq, start, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
        gain.gain.setValueAtTime(0, audioCtx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + start + 0.01); 
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + start);
        osc.stop(audioCtx.currentTime + start + duration);
      };

      // Melodía rítmica (Double-Ding tipo iOS) repetida por 4 segundos
      for (let i = 0; i < 6; i++) {
        const offset = i * 0.7; // Espaciado entre repeticiones
        playNote(1567.98, offset, 0.3); // Nota aguda (Sol 6)
        playNote(1174.66, offset + 0.12, 0.5); // Nota media (Re 6)
      }
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
    
    if (user.role === 'admin' || user.role === 'almacen') {
      const base = [
        { label: 'Gestión Almacén', path: '/almacen/dashboard' },
        { label: 'Inventario Global', path: '/logistica/materiales' },
        { label: 'Bitácora FO-DO-017', path: '/logistica/bitacora' }
      ];
      if (user.role === 'admin') {
        base.push({ label: 'Auditoría Global', path: '/logistica/admin' });
        base.push({ label: 'Recepción Lab', path: '/logistica/recepcion' });
      }
      return base;
    } else if (user.role === 'captura') {
      return [
        { label: 'Subir Resultados', path: '/captura' },
        { label: 'Historial', path: '/resultados' }
      ];
    } else if (user.role === 'quimico') {
      return [
        { label: 'Solicitar Material', path: '/almacen/solicitud' },
        { label: 'Recepción Matriz', path: '/logistica/recepcion' },
        { label: 'Bitácora FO-DO-017', path: '/logistica/bitacora' },
        { label: 'Mis Materiales', path: '/logistica/materiales' }
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

      <div className={styles.mainNav}>
        <div className={styles.logoWrapper}>
          <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <Logo size="md" />
          </div>

          {/* Notificaciones junto al Logo */}
          <div className={styles.notificationWrapper}>
            <span 
              className={`material-symbols-rounded ${styles.iconBtn} ${unreadCount > 0 ? styles.hasUnread : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifications(!showNotifications);
                if (!showNotifications) markAllAsRead();
              }}
            >
              notifications
            </span>
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}

            {showNotifications && (
              <div className={styles.notificationDropdown} onClick={(e) => e.stopPropagation()}>
                <div className={styles.notifHeader}>
                  <h4>Notificaciones</h4>
                  <button onClick={() => setShowNotifications(false)}>&times;</button>
                </div>
                <div className={styles.notifList}>
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div key={n.id} className={`${styles.notifItem} ${!n.read ? styles.unreadItem : ''}`}>
                        <div className={styles.notifDot}></div>
                        <div className={styles.notifContent}>
                          <div className={styles.notifTitle}>{n.title}</div>
                          <div className={styles.notifBody}>{n.message}</div>
                          <div className={styles.notifTime}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyNotif}>No hay notificaciones nuevas</div>
                  )}
                </div>
              </div>
            )}
          </div>
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
            <div 
              className={`${styles.avatarCircle} ${uploading ? styles.uploading : ''}`} 
              onClick={() => !uploading && document.getElementById('avatar-upload').click()}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              {user?.foto_url ? (
                <img src={user.foto_url} alt={user.name} className={styles.avatarImg} />
              ) : (
                user?.name ? user.name.charAt(0).toUpperCase() : 'U'
              )}
              
              {uploading && (
                <div className={styles.uploadOverlay}>
                  <span className="material-symbols-rounded">sync</span>
                </div>
              )}

              <input 
                type="file" 
                id="avatar-upload" 
                hidden 
                accept="image/*" 
                onChange={handleAvatarUpload}
              />
            </div>
          </div>

          {user?.role !== 'mensajero' && (
            <span className={`material-symbols-rounded ${styles.iconBtn}`}>
              search
            </span>
          )}

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

      {/* MODAL DE RECORTE DE IMAGEN */}
      {imageToCrop && (
        <div className={styles.cropModal}>
          <div className={styles.cropContainer}>
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className={styles.cropActions}>
            <button className={`${styles.cropBtn} ${styles.cancelBtn}`} onClick={() => setImageToCrop(null)}>
              Cancelar
            </button>
            <button className={`${styles.cropBtn} ${styles.confirmBtn}`} onClick={confirmUpload}>
              Recortar y Subir
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
