import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Cropper from 'react-easy-crop';
import styles from './TopNavbar.module.css';

export default function TopNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // States para el Cropper
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [swipedNotifId, setSwipedNotifId] = useState(null);
  const swipeStartX = useRef(0);
  const autoResetTimer = useRef(null);

  // Cerrar menús al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifMenu(false);
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cargar notificaciones (Solo hoy)
  useEffect(() => {
    if (!user) return;
    const isAdmin = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'administrador';

    const fetchNotifications = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = today.toISOString();

      let query = supabase.from('notificaciones').select('*');
      
      if (!isAdmin) {
        query = query.or(`role.eq.${user.role},user_id.eq.${user.id},sucursal.eq.${user.sucursal || user.branch}`);
      }

      const { data } = await query
        .gte('created_at', startOfToday)
        .order('created_at', { ascending: false });
        
      if (data) setNotifications(data);
    };
    fetchNotifications();

    const channel = supabase
      .channel('notificaciones_navbar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, payload => {
        const nuevo = payload.new;
        const userBranch = user.sucursal || user.branch;
        
        // ADMIN ve todo. Otros solo lo propio o su sede.
        if (isAdmin || nuevo.role === user.role || nuevo.user_id === user.id || (nuevo.sucursal && nuevo.sucursal === userBranch)) {
          setNotifications(prev => [nuevo, ...prev]);
          playNotificationSound();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase
      .from('notificaciones')
      .update({ read: true })
      .or(`role.eq.${user.role},user_id.eq.${user.id},sucursal.eq.${user.sucursal || user.branch}`)
      .eq('read', false);
  };

  const deleteNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notificaciones').delete().eq('id', id);
  };

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    if (!croppedAreaPixels || !image) return;
    setIsUploading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = image;
      await new Promise(res => img.onload = res);
      canvas.width = 200;
      canvas.height = 200;
      ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 200, 200);

      const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', 0.8));
      const fileName = `${user.id}_${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, blob);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('empleados').update({ foto_url: publicUrl }).eq('id', user.id);
      if (dbError) throw dbError;

      updateUser({ foto_url: publicUrl });
      setImage(null);
    } catch (error) {
      console.error(error);
      alert('Error al actualizar avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const getMenuOptions = () => {
    if (!user) return [];
    const r = user.role?.toLowerCase();
    const options = [{ label: 'Inicio', path: '/', icon: 'home' }];

    // Casos por rol (Sincronizado con Sucursales.jsx)
    if (r === 'admin' || r === 'captura' || r.includes('técnico') || r.includes('tecnico')) {
      options.push({ label: 'Captura Resultados', path: '/captura', icon: 'add_task' });
      options.push({ label: 'Resultados Listos', path: '/resultados', icon: 'verified_user' });
    }

    if (r === 'admin' || r === 'quimico' || r === 'químico') {
      options.push({ label: 'Recepción Matriz', path: '/logistica/recepcion', icon: 'lab_research' });
      options.push({ label: 'Bitácora FO-DO-017', path: '/logistica/bitacora', icon: 'assignment' });
      options.push({ label: 'Solicitud Insumos', path: '/almacen/nueva-solicitud', icon: 'shopping_cart' });
    }

    if (r === 'admin') {
      options.push({ label: 'Gestionar Publicidad', path: '/admin/promociones', icon: 'campaign' });
    }

    if (r === 'admin' || r === 'recepcion' || r === 'recepción') {
      options.push({ label: 'Mi Bitácora', path: '/logistica/bitacora', icon: 'assignment' });
      options.push({ label: 'Estado Sede', path: '/logistica/sede', icon: 'store' });
    }

    if (r === 'admin' || r === 'almacen') {
      options.push({ 
        label: 'Almacén', 
        path: '/almacen', 
        icon: 'inventory_2',
        children: [
          { label: 'Inventario General', path: '/almacen/inventario', icon: 'grid_view' },
          { label: 'Materiales', path: '/almacen/materiales', icon: 'category' },
          { label: 'Solicitudes Material', path: '/almacen/solicitudes', icon: 'assignment_turned_in' },
        ]
      });

      options.push({
        label: 'Proveedores',
        path: '/almacen/proveedores',
        icon: 'local_shipping',
        children: [
          { label: 'Directorio', path: '/almacen/proveedores', icon: 'contact_page' },
          { label: 'Recepción de Pedidos', path: '/almacen/recepcion', icon: 'inventory' }
        ]
      });
    }

    if (r === 'mensajero') {
      options.push({ label: 'Ruta de Transporte', path: '/logistica/transporte', icon: 'route' });
    }

    // Rutas de las nuevas Áreas
    const areasConfig = {
      'hematologia': { label: 'Hematología', path: '/area/hematologia', icon: 'bloodtype' },
      'urianalisis': { label: 'Urianálisis', path: '/area/urianalisis', icon: 'science' },
      'microbiologia': { label: 'Microbiología', path: '/area/microbiologia', icon: 'biotech' },
      'quimica_clinica': { label: 'Química Clínica', path: '/area/quimica-clinica', icon: 'experiment' },
      'toma_de_muestra': { label: 'Toma de Muestra', path: '/area/toma-muestra', icon: 'vaccines' },
      'recepcion_area': { label: 'Recepción', path: '/area/recepcion', icon: 'person_add' },
      'direccion_operativa': { label: 'Dir. Operativa', path: '/area/direccion-operativa', icon: 'query_stats' },
      'recursos_humanos': { label: 'Recursos Humanos', path: '/area/recursos-humanos', icon: 'badge' },
      'contabilidad': { label: 'Contabilidad', path: '/area/contabilidad', icon: 'account_balance' },
    };

    // Si el rol exacto coincide con la clave del área, darle su acceso principal
    if (areasConfig[r]) {
      options.push(areasConfig[r]);
    }

    // Acceso universal a las aplicaciones de área si eres Admin
    if (r === 'admin') {
      options.push({
        label: 'App de Áreas',
        path: '/area/hematologia',
        icon: 'apps',
        children: Object.values(areasConfig)
      });
    }

    return options;
  };

  const handleSwipeStart = (e) => {
    swipeStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleSwipeEnd = (e, notifId) => {
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const deltaX = swipeStartX.current - endX;

    if (deltaX > 50) { // Deslizamiento a la izquierda detectado
      setSwipedNotifId(notifId);

      // Auto-reset después de 4 segundos
      if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
      autoResetTimer.current = setTimeout(() => {
        setSwipedNotifId(null);
      }, 4000);
    } else if (deltaX < -30) { // Deslizamiento a la derecha (Cerrar manual)
      setSwipedNotifId(null);
      if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
    }
  };

  const menuOptions = getMenuOptions();


  return (
    <nav className={styles.navbarContainer} ref={dropdownRef}>
      <div className={styles.topStripe}></div>

      <div className={styles.navMain}>
        {/* IZQUIERDA: Logo + Campana Móvil */}
        <div className={styles.navLeft}>
          <div className={styles.brand} onClick={() => navigate('/')}>
            <div className={styles.logoCircle}><img src="/favicon.png" alt="S" /></div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>Solcan</span>
            </div>
          </div>

          <div className={styles.mobileNotifLeft}>
            <button className={styles.iconBtn} onClick={() => {
              if (navigator.vibrate) navigator.vibrate(50);
              setShowNotifMenu(!showNotifMenu);
              markAllAsRead();
            }}>
              <span className="material-symbols-rounded">notifications</span>
              {unreadCount > 0 && <span className={styles.notifCircle}>{unreadCount}</span>}
            </button>
          </div>

          <div className={styles.notifAreaPC}>
            <button className={styles.iconBtn} onClick={() => {
              if (navigator.vibrate) navigator.vibrate(50);
              setShowNotifMenu(!showNotifMenu);
              markAllAsRead();
            }}>
              <span className="material-symbols-rounded">notifications</span>
              {unreadCount > 0 && <span className={styles.notifCircle}>{unreadCount}</span>}
            </button>
          </div>
        </div>

        {/* CENTRO: Menú de Lectura Directa en PC */}
        <div className={styles.navCenterPC}>
          {menuOptions.map(o => (
            o.children ? (
              <div key={o.label} className={styles.dropdownParent}>
                <button className={`${styles.navItemPC} ${o.children.some(child => location.pathname.startsWith(child.path) || location.pathname === child.path) ? styles.activePC : ''}`} style={{background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'}}>
                  {o.label}
                  <span className="material-symbols-rounded" style={{fontSize: '18px'}}>expand_more</span>
                </button>
                <div className={styles.submenu}>
                  {o.children.map(child => (
                    <Link key={child.path} to={child.path} className={`${styles.submenuItem} ${location.pathname === child.path ? styles.activeSub : ''}`}>
                      <span className="material-symbols-rounded">{child.icon}</span>
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={o.path} to={o.path} className={`${styles.navItemPC} ${location.pathname === o.path ? styles.activePC : ''}`}>
                {o.label}
              </Link>
            )
          ))}
        </div>

        {/* DERECHA: Datos de Usuario y Acciones Rápidas */}
        <div className={styles.navActionsRight}>
          <div className={styles.userInfoPC}>
            <span className={styles.helloText}>Hola, {user?.name?.split(' ')[0] || 'Usuario'}</span>
            <div className={styles.dividerPC}></div>
            {(user?.sucursal || user?.branch) && (
              <div className={styles.branchStatusPC}>
                <span className="material-symbols-rounded">location_on</span>
                <span>{user.sucursal || user.branch}</span>
              </div>
            )}
          </div>

          <div className={styles.profileArea}>
            <div className={styles.avatarCircle} onClick={() => setShowProfileMenu(!showProfileMenu)}>
              {user?.foto_url ? <img src={user.foto_url} alt="U" /> : <span>{user?.name?.charAt(0)}</span>}
            </div>
            {showProfileMenu && (
              <div className={styles.profileDropdown}>
                <div className={styles.profileHeader}>
                  <div className={styles.profileInfoRow}>
                    <span className="material-symbols-rounded">person</span>
                    <div className={styles.profileText}>
                      <h4>{user?.name || 'Usuario'}</h4>
                      <span className={styles.roleTag}>{user?.role || 'Personal'}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.profileItems}>
                  <button className={styles.profileOption} onClick={() => fileInputRef.current.click()}>
                    <span className="material-symbols-rounded">add_a_photo</span>
                    Cambiar Foto de Perfil
                  </button>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={onFileChange} />
                </div>
              </div>
            )}
          </div>

          <div className={styles.controlIconsPC}>
            <button className={styles.iconBtn} onClick={logout}><span className="material-symbols-rounded">logout</span></button>
          </div>

          <div className={styles.mobileOnly}>
            <button className={styles.iconBtn} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <span className="material-symbols-rounded">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* NOTIFICACIONES UNIVERSAL (Fuera de contenedores hijos para evitar ocultamiento) */}
      {showNotifMenu && (
        <div className={styles.notifDropdown}>
          <div className={styles.notifHeader}>
            <h4>Avisos de Hoy</h4>
            <button className={styles.clearBtn} onClick={() => { setNotifications([]); setShowNotifMenu(false); }}>Limpiar</button>
          </div>
          <div className={styles.notifList}>
            {notifications.map(n => (
              <div key={n.id} className={styles.swipeNotifContainer}>
                <button
                  className={styles.revealDeleteBtn}
                  onClick={() => { deleteNotification(n.id); setSwipedNotifId(null); }}
                >
                  <span className="material-symbols-rounded">delete</span>
                  <span>Borrar</span>
                </button>

                <div
                  className={`${styles.notifItem} ${swipedNotifId === n.id ? styles.isSwiped : ''}`}
                  onTouchStart={handleSwipeStart}
                  onTouchEnd={(e) => handleSwipeEnd(e, n.id)}
                  onMouseDown={handleSwipeStart}
                  onMouseUp={(e) => handleSwipeEnd(e, n.id)}
                >
                  <div className={styles.notifDot}></div>
                  <div className={styles.notifTextContent}>
                    <div className={styles.notifUpper}>
                      <h4>{n.title}</h4>
                      <div className={styles.notifMetaRight}>
                        <span className={styles.notifTime}>{formatNotifDate(n.created_at)}</span>
                      </div>
                    </div>
                    <p>{n.message}</p>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && <p className={styles.emptyNotif}>Sin avisos para hoy</p>}
          </div>
        </div>
      )}

      {/* OVERLAY MÓVIL */}
      {mobileMenuOpen && (
        <div className={styles.mobileOverlay}>
          <div className={styles.mobileProfileHeader}>
            <div className={styles.mobileAvatarLarge}>
              {user?.foto_url ? <img src={user.foto_url} alt="U" /> : <span>{user?.name?.charAt(0)}</span>}
            </div>
            <h3>{user?.name}</h3>
            <p>{user?.sucursal || user?.branch}</p>
          </div>
          <nav className={styles.mobileNav}>
            {menuOptions.map(o => (
              <div key={o.label || o.path}>
                {o.children ? (
                  <>
                    <div className={styles.mobileNavItem} style={{background: 'transparent', marginBottom: '0'}}>
                      <span className="material-symbols-rounded">{o.icon}</span>
                      {o.label}
                    </div>
                    <div className={styles.mobileNestedNav}>
                      {o.children.map(child => (
                        <Link 
                          key={child.path} 
                          to={child.path} 
                          className={`${styles.mobileSubItem} ${location.pathname === child.path ? styles.mobileSubItemActive : ''}`} 
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          • {child.label}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <Link key={o.path} to={o.path} className={styles.mobileNavItem} onClick={() => setMobileMenuOpen(false)}>
                    <span className="material-symbols-rounded">{o.icon}</span>
                    {o.label}
                  </Link>
                )}
              </div>
            ))}
            <button className={styles.mobileLogoutBtn} onClick={logout}>
              <span className="material-symbols-rounded">logout</span> Cerrar Sesión
            </button>
          </nav>
        </div>
      )}

      {/* CROP MODAL */}
      {image && (
        <div className={styles.cropOverlay}>
          <div className={styles.cropModal}>
            <h3>Ajustar Foto de Perfil</h3>
            <div className={styles.cropContainer}>
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className={styles.cropActions}>
              <button className={styles.cancelBtn} onClick={() => setImage(null)}>Cancelar</button>
              <button className={styles.saveBtn} onClick={handleUpdateProfile} disabled={isUploading}>
                {isUploading ? 'Guardando...' : 'Establecer Foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}


const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playNote = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Tono iOS-Style (Double Ding)
    playNote(1567.98, 0, 0.4); // Sol 6
    playNote(1174.66, 0.12, 0.5); // Re 6

    // Vibración (Larga de 1 segundo para prueba definitiva)
    if (navigator.vibrate) {
      navigator.vibrate(1000);
    }

    // Auto-close context para liberar recursos
    setTimeout(() => ctx.close(), 1000);
  } catch (err) {
    console.warn("Audio blocked by browser policy:", err);
  }
};

const formatNotifDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Hoy, ${timeStr}`;
  return `${d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${timeStr}`;
};
