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
    } catch (e) { console.error(e); } finally { setIsUploading(false); }
  };

  const getMenuOptions = () => {
    if (!user) return [];
    const r = user.role?.toLowerCase();
    const options = [{ label: 'Inicio', path: '/', icon: 'home' }];

    if (r === 'admin' || r === 'captura' || r.includes('técnico') || r.includes('tecnico')) {
      options.push({ label: 'Captura Resultados', path: '/captura', icon: 'add_task' });
      options.push({ label: 'Resultados Listos', path: '/resultados', icon: 'verified_user' });
    }

    if (r === 'admin' || r === 'quimico' || r === 'químico') {
      options.push({ label: 'Recepción Matriz', path: '/logistica/recepcion', icon: 'lab_research' });
      options.push({ label: 'Bitácora FO-DO-017', path: '/logistica/bitacora', icon: 'assignment' });
      options.push({ label: 'Solicitud Insumos', path: '/almacen/nueva-solicitud', icon: 'shopping_cart' });
    }

    if (r === 'mensajero') {
      options.push({ label: 'Ruta Transporte', path: '/logistica/transporte', icon: 'route' });
    }

    const areasConfig = {
      'hematologia': { 
        label: 'Hematología', path: '/area/hematologia', icon: 'bloodtype',
        children: [
          { label: 'Dashboard Área', path: '/area/hematologia', icon: 'dashboard_customize' },
          { label: 'Inventario y Calidad', path: '/area/hematologia/inventario', icon: 'inventory_2' }
        ]
      }
    };

    if (areasConfig[r]) options.push(areasConfig[r]);
    return options;
  };

  const menuOptions = getMenuOptions();

  return (
    <nav className={styles.navbarContainer} ref={dropdownRef}>
      <div className={styles.topStripe}></div>
      <div className={styles.navMain}>
        <div className={styles.navLeft}>
          <div className={styles.brand} onClick={() => navigate('/')}>
            <div className={styles.logoCircle}><img src="/favicon.png" alt="S" /></div>
            <span className={styles.brandName}>Solcan</span>
          </div>
          <button className={styles.iconBtn} onClick={() => { setShowNotifMenu(!showNotifMenu); markAllAsRead(); }}>
            <span className="material-symbols-rounded">notifications</span>
            {unreadCount > 0 && <span className={styles.notifCircle}>{unreadCount}</span>}
          </button>
        </div>

        <div className={styles.navCenterPC}>
          {user?.role?.toLowerCase() !== 'admin' && menuOptions.map(o => (
            o.children ? (
              <div key={o.label} className={styles.dropdownParent}>
                <button className={`${styles.navItemPC} ${o.children.some(c => location.pathname === c.path) ? styles.activePC : ''}`}>
                  {o.label} <span className="material-symbols-rounded">expand_more</span>
                </button>
                <div className={styles.submenu}>
                  {o.children.map(c => <Link key={c.path} to={c.path} className={styles.submenuItem}>{c.label}</Link>)}
                </div>
              </div>
            ) : <Link key={o.path} to={o.path} className={`${styles.navItemPC} ${location.pathname === o.path ? styles.activePC : ''}`}>{o.label}</Link>
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
                  <div className={styles.profileAvatarLarge}>{user?.foto_url ? <img src={user.foto_url} alt="U" /> : <span>{finalDisplayName.charAt(0)}</span>}</div>
                  <div className={styles.profileHeaderText}><h4>{finalDisplayName}</h4><span className={styles.roleTag}>{user.role}</span></div>
                </div>
                <div className={styles.profileActions}>
                  <button className={styles.profileOption} onClick={() => fileInputRef.current.click()}><span className="material-symbols-rounded">add_a_photo</span> Cambiar Foto</button>
                  <div className={styles.profileDivider}></div>
                  <button className={`${styles.profileOption} ${styles.logoutOption}`} onClick={logout}><span className="material-symbols-rounded">logout</span> Cerrar Sesión</button>
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onload=()=>setImage(r.result); r.readAsDataURL(f); }}} />
              </div>
            )}
          </div>
          <button className={styles.pcLogoutBtn} onClick={logout} title="Cerrar Sesión"><span className="material-symbols-rounded">logout</span></button>
          <button className={styles.mobileOnly} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><span className="material-symbols-rounded">{mobileMenuOpen ? 'close' : 'menu'}</span></button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className={styles.mobileOverlay}>
          <nav className={styles.mobileNav}>
            {menuOptions.map(o => <Link key={o.label} to={o.path || '#'} className={styles.mobileNavItem} onClick={() => setMobileMenuOpen(false)}>{o.label}</Link>)}
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
