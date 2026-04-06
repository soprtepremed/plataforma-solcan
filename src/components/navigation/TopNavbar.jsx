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
  const [showProfile, setShowProfile] = useState(false);

  // Cropper states
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const VAPID_PUBLIC_KEY = 'BDQcmHxsTZt5zXvSixGMkwgFhOYM0q7nJ76Xr11MAZidIOl7T-UGYpA-LwDtVARJwMNwwiXgjqu_IRjqhCmwfY4';

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

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const checkPushSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushSupported(false);
      return;
    }
    setPushSupported(true);
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    // Sincronización forzada: Si el navegador tiene suscripción, la aseguramos en la BD
    if (subscription) {
      performPushSubscription(subscription);
    } else if (Notification.permission === 'granted') {
      performPushSubscription();
    }
    
    setPushSubscribed(!!subscription);
  };

  const performPushSubscription = async (existingSub = null) => {
    if (isSubscribing && !existingSub) return;
    setIsSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = existingSub || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const { error } = await supabase.from('push_subscriptions').upsert({
         user_id: user.id,
         subscription: subscription,
         device_name: navigator.userAgent.split(')')[0].split('(')[1] || 'Dispositivo Desconocido'
      }, { onConflict: 'user_id, subscription' });

      if (error) {
        console.error('Error de Guardado:', error);
        alert('🚨 ERROR DE REGISTRO: ' + error.message + ' (Detalles: ' + error.hint + ')');
      }
      setPushSubscribed(true);
    } catch (err) {
      console.error('Auto-Push Sync Error:', err);
      alert('🚨 ERROR FATAL: ' + err.message);
    } finally {

      setIsSubscribing(false);
    }
  };

  const handlePushToggle = async () => {
    if (isSubscribing) return;
    setIsSubscribing(true);

    try {
      if (pushSubscribed) {
        // Lógica de DESACTIVACIÓN (OFF)
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          // Solo eliminamos ESTE dispositivo específico de la base de datos
          await supabase.from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('subscription', subscription);
        }
        setPushSubscribed(false);

        playSample('note'); // Sonido de desactivación
      } else {
        // Lógica de ACTIVACIÓN (ON)
        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            setIsSubscribing(false);
            return;
          }
        }
        await performPushSubscription();
        setPushSubscribed(true);
        playSample('ding');
      }
    } catch (err) {
      console.error('Push Toggle Error:', err);
    } finally {
      setIsSubscribing(false);
    }
  };



  // Efecto de inicialización automática
  useEffect(() => {
    if (user) {
      checkPushSubscription();
    }
  }, [user]);

  // Suscripción en tiempo real a notificaciones
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const isoToday = today.toISOString();

      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .or(`role.eq.${user.role},user_id.eq.${user.id},metadata->>sucursal.eq."${user.branch}"`)
        .gte('created_at', isoToday)
        .order('created_at', { ascending: false })
        .limit(20);
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
          // Solo agregar si es de hoy (para consistencia con el filtro inicial)
          const today = new Date();
          today.setHours(0,0,0,0);
          if (new Date(nuevo.created_at) >= today) {
            setNotifications(prev => [nuevo, ...prev].slice(0, 20));
          }
          
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

          // Sonido diferenciado por rol
          if (user.role === 'mensajero') {
            playSample('tritone');
          } else {
            playSample('note');
          }
          setCount(prev => prev + 1);
        }
      })
      .subscribe();


    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  const formatNotifDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    if (isToday) return timeStr;
    
    return `${date.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${timeStr}`;
  };

  const dismissNotification = async (e, id) => {
    e.stopPropagation();
    // Animación optimista: Eliminamos de la lista local
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Eliminamos de la base de datos para que no reaparezca
    await supabase.from('notificaciones').delete().eq('id', id);
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
    if (!user || !user.role) return [];
    
    const role = user.role.toLowerCase();

    if (role === 'admin' || role === 'administrador' || role === 'almacen') {
      const base = [
        { label: 'Gestión Almacén', path: '/almacen/dashboard' },
        { label: 'Inventario Global', path: '/logistica/materiales' },
        { label: 'Bitácora FO-DO-017', path: '/logistica/bitacora' }
      ];
      if (role === 'admin' || role === 'administrador') {
        base.push({ label: 'Auditoría Global', path: '/logistica/admin' });
        base.push({ label: 'Recepción Lab', path: '/logistica/recepcion' });
      }
      return base;
    } else if (role === 'captura') {
      return [
        { label: 'Subir Resultados', path: '/captura' },
        { label: 'Historial', path: '/resultados' }
      ];
    } else if (role === 'quimico') {
      return [
        { label: 'Recepción Matriz', path: '/logistica/recepcion' },
        { label: 'Bitácora FO-DO-017', path: '/logistica/bitacora' },
        { label: 'Solicitar Insumos', path: '/almacen/solicitud' }
      ];
    } else if (role === 'recepcion' || role === 'recepción') {
      return [
        { label: 'Preparar Envío', path: '/logistica/envio' },
        { label: 'Mi Bitácora', path: '/logistica/bitacora' },
        { label: 'Estado Sede', path: '/logistica/sede' }
      ];
    } else if (role === 'mensajero') {
      return [
        { label: 'Ruta de Transporte', path: '/logistica/transporte' }
      ];
    }
    return [];
  };

  const menuOptions = getMenuOptions();

  const playSample = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playFreq = (freq, start, duration, typeOsc = 'triangle', vol = 0.3) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = typeOsc;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
        gain.gain.setValueAtTime(0, audioCtx.currentTime + start);
        gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + start + 0.01); 
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + start);
        osc.stop(audioCtx.currentTime + start + duration);
      };

      if (type === 'tritone') {
        // iPhone Tri-tone (D6 - B5 - G5 aprox)
        playFreq(1174.66, 0, 0.2, 'sine', 0.4); // Re 6
        playFreq(987.77, 0.15, 0.2, 'sine', 0.3); // Si 5
        playFreq(783.99, 0.3, 0.4, 'sine', 0.2); // Sol 5
      } else if (type === 'note') {
        // iPhone Note (C6 - G6)
        playFreq(1046.50, 0, 0.15, 'sine', 0.4);
        playFreq(1567.98, 0.1, 0.3, 'sine', 0.3);
      } else if (type === 'ding') {
        // Pure Glass Ding
        playFreq(2000, 0, 0.4, 'sine', 0.4);
      }
    } catch (err) { console.warn(err); }
  };

  const roleLabels = {
    'admin': 'Administrador General',
    'quimico': 'Químico Analista',
    'recepcion': 'Recepción de Sucursal',
    'mensajero': 'Operador Logístico',
    'captura': 'Asistente de Captura',
    'almacen': 'Gestión de Almacén'
  };

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
                          <div className={styles.notifMeta}>
                             <span className={styles.notifTime}>{formatNotifDate(n.created_at)}</span>
                             <button 
                               className={styles.dismissBtn} 
                               onClick={(e) => dismissNotification(e, n.id)}
                               title="Descartar"
                             >
                                <span className="material-symbols-rounded">close</span>
                             </button>
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
              onClick={() => !uploading && setShowProfile(!showProfile)}
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

            {showProfile && (
              <div className={styles.profileDropdown} onClick={(e) => e.stopPropagation()}>
                <button 
                  className={styles.closeProfileBtn} 
                  onClick={() => setShowProfile(false)}
                  title="Cerrar Menú"
                >
                  <span className="material-symbols-rounded">close</span>
                </button>
                <div className={styles.profileHeader}>

                   <div className={styles.profileAvatarLarge}>
                      {user?.foto_url ? (
                        <img src={user.foto_url} alt={user.name} />
                      ) : (
                        user?.name?.charAt(0).toUpperCase()
                      )}
                   </div>
                   <div className={styles.profileMeta}>
                      <div className={styles.profileName}>
                        {user?.name}
                      </div>
                      <div className={styles.profileBranch}>
                        📍 {user?.branch}
                      </div>
                      <div className={styles.profileRole}>
                        {roleLabels[user?.role?.toLowerCase()] || user?.role}
                      </div>
                   </div>
                </div>

                <div className={styles.profileActions}>

                   <div className={styles.profileDivider}></div>
                    {pushSupported && (
                      <div className={styles.pushToggleRow}>
                         <div className={styles.pushToggleRowLabel}>
                            <span>Notificaciones Push</span>
                            <small>{pushSubscribed ? 'En segundo plano (ON)' : 'Inactivas (OFF)'}</small>
                         </div>
                         <label className={styles.toggleSwitch}>
                            <input 
                              type="checkbox" 
                              checked={pushSubscribed} 
                              onChange={handlePushToggle}
                              disabled={isSubscribing}
                            />
                            <span className={styles.toggleSlider}></span>
                         </label>
                      </div>
                    )}

                    {pushSupported && (
                      <button 
                        className={styles.profileActionBtn} 
                        style={{ color: 'var(--co-accent)', border: '1px solid var(--co-accent-soft)', margin: '5px 10px' }}
                        onClick={async () => {
                          const registration = await navigator.serviceWorker.ready;
                          registration.showNotification('🛎️ Prueba Local Solcan', {
                            body: 'Si ves esto, el celular SÍ permite avisos. El problema es la sincronización.',
                            vibrate: [200, 100, 200]
                          });
                          alert('He disparado una alerta interna. ¿Te vibró el cel?');
                        }}
                      >
                         <span className="material-symbols-rounded">vibration</span>
                         Probar Notif. Local
                      </button>
                    )}


                   <button className={styles.profileActionBtn} onClick={() => { setShowProfile(false); document.getElementById('avatar-upload').click(); }}>
                      <span className="material-symbols-rounded">photo_camera</span>
                      Cambiar Foto de Perfil
                   </button>
                   <button className={`${styles.profileActionBtn} ${styles.logoutBtnAction}`} onClick={() => { setShowProfile(false); logout(); }}>
                      <span className="material-symbols-rounded">logout</span>
                      Cerrar Sesión
                   </button>
                </div>
              </div>
            )}
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
