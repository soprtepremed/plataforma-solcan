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
    const fetchNotifications = async () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const startOfToday = today.toISOString();

      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .or(`role.eq.${user.role},user_id.eq.${user.id}`)
        .gte('created_at', startOfToday)
        .order('created_at', { ascending: false });
      if (data) setNotifications(data);
    };
    fetchNotifications();

    const channel = supabase
      .channel('notificaciones_navbar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, payload => {
        const nuevo = payload.new;
        if (nuevo.role === user.role || nuevo.user_id === user.id) {
           setNotifications(prev => [nuevo, ...prev]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.length;

  const markAllAsRead = () => {
    // Lógica local para limpiar el badge
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
    if (r === 'admin' || r === 'administrador' || r === 'quimico' || r === 'químico') {
      return [
        { label: 'Recepción Matriz', path: '/logistica/recepcion', icon: 'lab_research' },
        { label: 'Bitácora FO-DO-017', path: '/logistica/bitacora', icon: 'assignment' },
        { label: 'Solicitar Insumos', path: '/almacen/solicitud', icon: 'shopping_cart' }
      ];
    }
    if (r === 'recepcion' || r === 'recepción') {
      return [
        { label: 'Preparar Envío', path: '/logistica/envio', icon: 'local_shipping' },
        { label: 'Mi Bitácora', path: '/logistica/bitacora', icon: 'assignment' },
        { label: 'Estado Sede', path: '/logistica/sede', icon: 'store' }
      ];
    }
    if (r === 'mensajero') return [ { label: 'Ruta de Transporte', path: '/logistica/transporte', icon: 'route' } ];
    return [];
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

  const formatNotifDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Hoy, ${timeStr}`;
    return `${d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${timeStr}`;
  };

  return (
    <nav className={styles.navbarContainer} ref={dropdownRef}>
      <div className={styles.topStripe}></div>
      
      <div className={styles.navMain}>
        {/* IZQUIERDA: Logo + Notificaciones en PC */}
        <div className={styles.navLeft}>
          <div className={styles.brand} onClick={() => navigate('/')}>
             <div className={styles.logoCircle}><img src="/favicon.png" alt="S" /></div>
             <div className={styles.brandText}>
                <span className={styles.brandName}>Solcan</span>
             </div>
          </div>

          {/* Campana Móvil junto al Logo */}
          <div className={styles.mobileNotifLeft}>
             <button className={styles.iconBtn} onClick={() => { setShowNotifMenu(!showNotifMenu); markAllAsRead(); }}>
                <span className="material-symbols-rounded">notifications</span>
                {unreadCount > 0 && <span className={styles.notifCircle}>{unreadCount}</span>}
             </button>
          </div>
          
          <div className={styles.notifAreaPC}>
            <button className={styles.iconBtn} onClick={() => { setShowNotifMenu(!showNotifMenu); markAllAsRead(); }}>
              <span className="material-symbols-rounded">notifications</span>
              {unreadCount > 0 && <span className={styles.notifCircle}>{unreadCount}</span>}
            </button>
          </div>

          <div className={styles.notifAreaPC}>
            <button className={styles.iconBtn} onClick={() => { setShowNotifMenu(!showNotifMenu); markAllAsRead(); }}>
              <span className="material-symbols-rounded">notifications</span>
              {unreadCount > 0 && <span className={styles.notifCircle}>{unreadCount}</span>}
        </div>

        {/* CENTRO: Menú de Lectura Directa en PC */}
        <div className={styles.navCenterPC}>
           {menuOptions.map(o => (
             <Link key={o.path} to={o.path} className={`${styles.navItemPC} ${location.pathname === o.path ? styles.activePC : ''}`}>
               {o.label}
             </Link>
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
              <button className={styles.iconBtn}><span className="material-symbols-rounded">search</span></button>
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
               <Link key={o.path} to={o.path} className={styles.mobileNavItem} onClick={() => setMobileMenuOpen(false)}>
                 <span className="material-symbols-rounded">{o.icon}</span>
                 {o.label}
               </Link>
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
