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

  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [swipedNotifId, setSwipedNotifId] = useState(null);
  const swipeStartX = useRef(0);
  const autoResetTimer = useRef(null);

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

  useEffect(() => {
    if (!user) return;
    const isAdmin = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'administrador';
    const fetchNotifications = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = today.toISOString();
      let query = supabase.from('notificaciones').select('*');
      if (!isAdmin) query = query.or(`role.eq.${user.role},user_id.eq.${user.id},sucursal.eq.${user.sucursal || user.branch}`);
      const { data } = await query.gte('created_at', startOfToday).order('created_at', { ascending: false });
      if (data) setNotifications(data);
    };
    fetchNotifications();
    const channel = supabase.channel('notificaciones_navbar').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, payload => {
      const nuevo = payload.new;
      if (isAdmin || nuevo.role === user.role || nuevo.user_id === user.id) setNotifications(prev => [nuevo, ...prev]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase.from('notificaciones').update({ read: true }).or(`role.eq.${user.role},user_id.eq.${user.id}`).eq('read', false);
  };

  const deleteNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notificaciones').delete().eq('id', id);
  };

  const getAreaName = () => {
    if (!user?.role) return '';
    const r = user.role.toLowerCase();
    const names = {
      'hematologia': 'Hematología',
      'microbiologia': 'Microbiología',
      'urianalisis': 'Urianálisis',
      'quimica_clinica': 'Química Clínica',
      'serologia': 'Serología'
    };
    return names[r] || user?.name?.split(' ')[0] || 'Usuario';
  };

  const finalDisplayName = getAreaName();

  const handleUpdateProfile = async () => {
    if (!croppedAreaPixels || !image) return;
    setIsUploading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = image;
      await new Promise(res => img.onload = res);
      canvas.width = 200; canvas.height = 200;
      ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 200, 200);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', 0.8));
      const fileName = `${user.id}_${Date.now()}.webp`;
      await supabase.storage.from('avatars').upload(fileName, blob);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('empleados').update({ foto_url: publicUrl }).eq('id', user.id);
      updateUser({ foto_url: publicUrl });
      setImage(null);
    } catch (e) { 
      console.error(e); 
      alert('Error actualizando perfil');
    } finally { 
      setIsUploading(false); 
    }
  };

  const getMenuOptions = () => {
    if (!user) return [];
    const r = user.role?.toLowerCase();
    const options = [{ label: 'Inicio', path: '/', icon: 'home' }];

    // Captura y Resultados
    if (r === 'admin' || r === 'captura' || r.includes('técnico') || r.includes('tecnico')) {
      options.push({ label: 'Captura Resultados', path: '/captura', icon: 'add_task' });
      options.push({ label: 'Resultados Listos', path: '/resultados', icon: 'verified_user' });
    }

    // Químico Central (Matriz)
    if (r === 'admin' || r === 'quimico' || r === 'químico') {
      options.push({ label: 'Recepción Matriz', path: '/logistica/recepcion', icon: 'lab_research' });
      options.push({ label: 'Bitácora FO-DO-017', path: '/logistica/bitacora', icon: 'assignment' });
      options.push({ label: 'Solicitud Insumos', path: '/almacen/nueva-solicitud', icon: 'shopping_cart' });
    }

    if (r === 'admin' || r === 'recepcion' || r === 'recepción') {
      options.push({ label: 'Relación de Folios', path: '/area/toma-muestra', icon: 'note_add' });
      options.push({ label: 'Mi Bitácora', path: '/logistica/bitacora', icon: 'assignment' });
      options.push({ label: 'Estado Sede', path: '/logistica/sede', icon: 'store' });
    }

    // Almacén
    if (r === 'admin' || r === 'almacen') {
      options.push({ 
        label: 'Almacén', path: '/almacen', icon: 'inventory_2',
        children: [
          { label: 'Inventario General', path: '/almacen/inventario', icon: 'grid_view' },
          { label: 'Materiales', path: '/almacen/materiales', icon: 'category' },
          { label: 'Solicitudes Material', path: '/almacen/solicitudes', icon: 'assignment_turned_in' },
          { label: 'Requisiciones de Compra', path: '/almacen/requisiciones', icon: 'shopping_cart' }
        ]
      });
      options.push({
        label: 'Proveedores', path: '/almacen/proveedores', icon: 'local_shipping',
        children: [
          { label: 'Directorio', path: '/almacen/proveedores', icon: 'contact_page' },
          { label: 'Recepción Pedidos', path: '/almacen/recepcion', icon: 'inventory' }
        ]
      });
    }

    if (r === 'mensajero') {
      options.push({ label: 'Ruta Transporte', path: '/logistica/transporte', icon: 'route' });
      options.push({ label: 'Mi Bitácora', path: '/logistica/bitacora', icon: 'assignment' });
    }

    // Configuración detallada de Áreas Técnicas
    const areasConfig = {
      'hematologia': { 
        label: 'Hematología', path: '/area/hematologia', icon: 'bloodtype',
        children: [
          { label: 'Dashboard Área', path: '/area/hematologia', icon: 'dashboard_customize' },
          { label: 'Inventario y Calidad', path: '/area/hematologia/inventario', icon: 'inventory_2' },
          { label: 'Acciones QC (FO-DO-012)', path: '/area/hematologia/control-calidad', icon: 'fact_check' },
          { label: 'Nueva Requisición', path: '/area/requisicion', icon: 'shopping_cart_checkout' },
          { label: 'Historial de Requisiciones', path: '/area/requisiciones/historial', icon: 'history' }
        ]
      },
      'microbiologia': { 
        label: 'Microbiología', path: '/area/microbiologia', icon: 'biotech',
        children: [
          { label: 'Dashboard Área', path: '/area/microbiologia', icon: 'dashboard_customize' },
          { label: 'Inventario y Calidad', path: '/area/microbiologia/inventario', icon: 'inventory_2' },
          { label: 'Acciones QC (FO-DO-012)', path: '/area/microbiologia/control-calidad', icon: 'fact_check' },
          { label: 'Nueva Requisición', path: '/area/requisicion', icon: 'shopping_cart_checkout' },
          { label: 'Historial de Requisiciones', path: '/area/requisiciones/historial', icon: 'history' }
        ]
      },
      'urianalisis': { 
        label: 'Urianálisis', path: '/area/urianalisis', icon: 'science',
        children: [
          { label: 'Dashboard Área', path: '/area/urianalisis', icon: 'dashboard_customize' },
          { label: 'Inventario y Calidad', path: '/area/urianalisis/inventario', icon: 'inventory_2' },
          { label: 'Acciones QC (FO-DO-012)', path: '/area/urianalisis/control-calidad', icon: 'fact_check' },
          { label: 'Nueva Requisición', path: '/area/requisicion', icon: 'shopping_cart_checkout' },
          { label: 'Historial de Requisiciones', path: '/area/requisiciones/historial', icon: 'history' }
        ]
      },
      'quimica_clinica': { 
        label: 'Química Clínica', path: '/area/quimica-clinica', icon: 'science',
        children: [
          { label: 'Dashboard Área', path: '/area/quimica-clinica', icon: 'dashboard_customize' },
          { label: 'Inventario y Calidad', path: '/area/quimica-clinica/inventario', icon: 'inventory_2' },
          { label: 'Parámetros Derivados', path: '/area/quimica-clinica/derivados', icon: 'calculate' },
          { label: 'Bitácora Maquilas', path: '/area/quimica-clinica/bitacora', icon: 'list_alt' },
          { label: 'Acciones QC (FO-DO-012)', path: '/area/quimica-clinica/control-calidad', icon: 'fact_check' },
          { label: 'Nueva Requisición', path: '/area/requisicion', icon: 'shopping_cart_checkout' },
          { label: 'Historial de Requisiciones', path: '/area/requisiciones/historial', icon: 'history' }
        ]
      },
      'serologia': { 
        label: 'Serología', path: '/area/serologia', icon: 'bloodtype',
        children: [
          { label: 'Dashboard Área', path: '/area/serologia', icon: 'dashboard_customize' },
          { label: 'Inventario y Calidad', path: '/area/serologia/inventario', icon: 'inventory_2' },
          { label: 'Acciones QC (FO-DO-012)', path: '/area/serologia/control-calidad', icon: 'fact_check' },
          { label: 'Nueva Requisición', path: '/area/requisicion', icon: 'shopping_cart_checkout' },
          { label: 'Historial de Requisiciones', path: '/area/requisiciones/historial', icon: 'history' }
        ]
      },
      'toma_de_muestra': { label: 'Relación de Folios', path: '/area/toma-muestra', icon: 'note_add' },
    };

    if (areasConfig[r]) options.push(areasConfig[r]);
    
    // Acceso administrativo a Áreas
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

  const handleSwipeEnd = (e, id) => { 
    setSwipedNotifId(id); 
    setTimeout(() => setSwipedNotifId(null), 3000); 
  };

  const menuOptions = getMenuOptions();

  return (
    <nav className={styles.navbarContainer} ref={dropdownRef}>
      <div className={styles.topStripe}></div>
      <div className={styles.navMain}>
        <div className={styles.navLeft}>
          <div className={styles.brand} onClick={() => navigate('/')}>
            <div className={styles.logoCircle}>
              <img src="/favicon.png" alt="Solcan" onError={(e) => e.target.style.display='none'} />
            </div>
            <span className={styles.brandName}>Solcan <span>Lab</span></span>
          </div>
          <button className={styles.iconBtn} onClick={() => { setShowNotifMenu(!showNotifMenu); markAllAsRead(); }}>
            <span className="material-symbols-rounded">notifications</span>
            {unreadCount > 0 && <span className={styles.notifCircle}>{unreadCount}</span>}
          </button>
        </div>

        <div className={styles.navCenterPC}>
          {user?.role?.toLowerCase().includes('admin') ? null : menuOptions.map(o => (
            o.children ? (
              <div key={o.label} className={styles.dropdownParent}>
                <button className={`${styles.navItemPC} ${o.children.some(c => location.pathname === c.path) ? styles.activePC : ''}`}>
                  {o.label} <span className="material-symbols-rounded">expand_more</span>
                </button>
                <div className={styles.submenu}>
                  {o.children.map(c => (
                    <Link key={c.path} to={c.path} className={`${styles.submenuItem} ${location.pathname === c.path ? styles.activeSub : ''}`}>
                      <span className="material-symbols-rounded">{c.icon || 'arrow_right'}</span>
                      {c.label}
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

        <div className={styles.navActionsRight}>
          <div className={styles.userInfoPC}>
            <span className={styles.helloText}>Hola, {finalDisplayName}</span>
            <div className={styles.dividerPC}></div>
          </div>
          <div className={styles.profileArea}>
            <div className={styles.avatarCircle} onClick={() => setShowProfileMenu(!showProfileMenu)}>
              {user?.foto_url ? <img src={user.foto_url} alt="U" /> : <span>{finalDisplayName.charAt(0)}</span>}
            </div>
            {showProfileMenu && (
              <div className={styles.profileDropdown}>
                <div className={styles.profileHeader}>
                  <div className={styles.profileAvatarLarge}>
                    {user?.foto_url ? <img src={user.foto_url} alt="U" /> : <span>{finalDisplayName.charAt(0)}</span>}
                  </div>
                  <div className={styles.profileHeaderText}>
                    <h4>{finalDisplayName}</h4>
                    <span className={styles.roleTag}>{user.role || 'Laboratorio'}</span>
                  </div>
                </div>
                <div className={styles.profileActions}>
                  <button className={styles.profileOption} onClick={() => fileInputRef.current.click()}>
                    <span className="material-symbols-rounded">add_a_photo</span>
                    Cambiar Foto
                  </button>
                  <div className={styles.profileDivider}></div>
                  <button className={`${styles.profileOption} ${styles.logoutOption}`} onClick={logout}>
                    <span className="material-symbols-rounded">logout</span>
                    Cerrar Sesión
                  </button>
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onload=()=>setImage(r.result); r.readAsDataURL(f); }}} />
              </div>
            )}
          </div>
          <button className={styles.pcLogoutBtn} onClick={logout} title="Cerrar Sesión">
            <span className="material-symbols-rounded">logout</span>
          </button>
          <button className={styles.mobileOnly} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span className="material-symbols-rounded">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {showNotifMenu && (
        <div className={styles.notifDropdown}>
          <div className={styles.notifHeader}><h4>Notificaciones</h4></div>
          <div className={styles.notifList}>
            {notifications.map(n => (
              <div key={n.id} className={`${styles.notifItem} ${swipedNotifId === n.id ? styles.isSwiped : ''}`}>
                <div className={styles.notifDot}></div>
                <div><h4>{n.title}</h4><p>{n.message}</p></div>
              </div>
            ))}
            {notifications.length === 0 && <p className={styles.emptyNotif}>Sin avisos para hoy</p>}
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div className={styles.mobileOverlay}>
          <button className={styles.mobileBackBtn} onClick={() => setMobileMenuOpen(false)}>
            <span className="material-symbols-rounded">arrow_back</span>
            Volver
          </button>
          <div className={styles.mobileProfileHeader}>
            <div className={styles.mobileAvatarLarge}>{user?.foto_url ? <img src={user.foto_url} alt="U" /> : <span>{finalDisplayName.charAt(0)}</span>}</div>
            <h3>{finalDisplayName}</h3>
            <p>{user.sucursal || user.branch}</p>
          </div>
          <nav className={styles.mobileNav}>
            {menuOptions.map(o => (
              <div key={o.label}>
                <Link to={o.path || '#'} className={styles.mobileNavItem} onClick={o.children ? null : () => setMobileMenuOpen(false)}>
                  <span className="material-symbols-rounded">{o.icon}</span> {o.label}
                </Link>
                {o.children && (
                  <div className={styles.mobileNestedNav}>
                    {o.children.map(c => (
                      <Link key={c.path} to={c.path} className={styles.mobileSubItem} onClick={() => setMobileMenuOpen(false)}>
                        • {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button className={styles.mobileLogoutBtn} onClick={logout}>Cerrar Sesión</button>
          </nav>
        </div>
      )}

      {image && (
        <div className={styles.cropOverlay}>
          <div className={styles.cropModal}>
            <div className={styles.cropContainer}><Cropper image={image} crop={crop} zoom={zoom} aspect={1} cropShape="round" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, p) => setCroppedAreaPixels(p)} /></div>
            <div className={styles.cropActions}><button onClick={() => setImage(null)}>Cancelar</button><button onClick={handleUpdateProfile}>Guardar</button></div>
          </div>
        </div>
      )}
    </nav>
  );
}
