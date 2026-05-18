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
  const [chatNotifications, setChatNotifications] = useState([]);
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

  useEffect(() => {
    if (!user) return;
    
    const r = (user?.role || '').toLowerCase().trim();
    const isQuimico = r.includes('quimico') || r.includes('químico');
    const isAdmin = r === 'admin' || r === 'administrador' || r === 'administración' || r.includes('logistica');
    const areaIds = ['hematologia', 'quimica_clinica', 'urianalisis', 'microbiologia', 'serologia', 'almacen', 'admin'];
    const isAreaStaff = areaIds.includes(r);
    const isBranch = !!(user?.branch || user?.sucursal) && !isAdmin && !isAreaStaff;
    const isAuthorized = (isAdmin || isBranch || isAreaStaff) && !isQuimico;

    if (!isAuthorized) return;

    const fetchUnreadChatMessages = async () => {
      let q = supabase.from('chat_messages').select('*').eq('leido', false).neq('emisor_id', user.id);
      if (isBranch) q = q.eq('sucursal', user.branch || user.sucursal);
      else if (!isAdmin) q = q.or(`canal.eq.${r},sucursal.ilike.%${r}%`);
      
      const { data } = await q;
      if (data) {
        const formatted = data.map(msg => ({
          id: msg.id,
          title: `Tienes un mensaje de ${msg.emisor_nombre}`,
          message: msg.contenido,
          read: false,
          created_at: msg.created_at,
          isChat: true,
          sucursal: msg.sucursal,
          canal: msg.canal
        }));
        setChatNotifications(formatted);
      }
    };

    fetchUnreadChatMessages();

    const channel = supabase.channel('chat_messages_navbar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
        fetchUnreadChatMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length + chatNotifications.length;
  const allNotifications = [...notifications, ...chatNotifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase.from('notificaciones').update({ read: true }).or(`role.eq.${user.role},user_id.eq.${user.id}`).eq('read', false);
  };

  const markSingleAsRead = async (id, isChat) => {
    if (isChat) {
      await supabase.from('chat_messages').update({ leido: true }).eq('id', id);
      setChatNotifications(prev => prev.filter(n => n.id !== id));
    } else {
      await supabase.from('notificaciones').update({ read: true }).eq('id', id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
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
      'serologia': 'Serología',
      'especiales': 'Especiales'
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
      // Acceso directo a temperaturas si es un rol de área
      const areaKey = r === 'admin' ? 'hematologia' : r.replace('_', '-');
      options.push({ label: 'Temperaturas', path: `/area/${areaKey}/temperaturas`, icon: 'device_thermostat' });
    }

    // Químico Central (Matriz)
    if (r === 'admin' || r === 'quimico' || r === 'químico') {
      options.push({ label: 'Recepción Matriz', path: '/logistica/recepcion', icon: 'lab_research' });
      options.push({ label: 'Relación Envíos Sucursales', path: '/logistica/sucursales-envio', icon: 'hub' });
      options.push({ label: 'Bitácora FO-DO-017', path: '/logistica/bitacora', icon: 'assignment' });
      options.push({ label: 'Solicitud de Material', path: '/almacen/nueva-solicitud', icon: 'shopping_cart' });
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
          { label: 'Historial de Vales', path: '/almacen/solicitudes', icon: 'assignment_turned_in' },
          { label: 'Historial de Requisiciones', path: '/almacen/requisiciones', icon: 'shopping_cart' },
          { label: 'Ingresar Stock', path: '/almacen/registro', icon: 'add_box' },
          { label: 'Recepción de Pedido', path: '/almacen/recepcion', icon: 'input' }
        ]
      });
      options.push({
        label: 'Proveedores', path: '/almacen/proveedores', icon: 'local_shipping',
        children: [
          { label: 'Directorio', path: '/almacen/proveedores', icon: 'contact_page' }
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
          { label: 'Tablero de Control de Área', path: '/area/hematologia', icon: 'dashboard_customize' },
          { label: 'Temperaturas', path: '/area/hematologia/temperaturas', icon: 'device_thermostat' },
          { label: 'Inventario y Control de Calidad', path: '/area/hematologia/inventario', icon: 'inventory_2' },
          { label: 'Acciones QC (FO-DO-012)', path: '/area/hematologia/control-calidad', icon: 'fact_check' },
          { label: 'Solicitud de Material', path: '/almacen/nueva-solicitud', icon: 'add_shopping_cart' },
          { label: 'Histórico de Vales de Material', path: '/area/vales/historial', icon: 'history_edu' },
          { label: 'Nueva Requisición', path: '/area/requisicion', icon: 'shopping_bag' },
          { label: 'Historial de Requisiciones', path: '/area/requisiciones/historial', icon: 'history' }
        ]
      },
      'microbiologia': { 
        label: 'Microbiología', path: '/area/microbiologia', icon: 'biotech',
        children: [
          { label: 'Tablero de Control de Área', path: '/area/microbiologia', icon: 'dashboard_customize' },
          { label: 'Temperaturas', path: '/area/microbiologia/temperaturas', icon: 'device_thermostat' },
          { label: 'Inventario y Control de Calidad', path: '/area/microbiologia/inventario', icon: 'inventory_2' },
          { label: 'Acciones QC (FO-DO-012)', path: '/area/microbiologia/control-calidad', icon: 'fact_check' },
          { label: 'Solicitud de Material', path: '/almacen/nueva-solicitud', icon: 'add_shopping_cart' },
          { label: 'Histórico de Vales de Material', path: '/area/vales/historial', icon: 'history_edu' },
          { label: 'Nueva Requisición', path: '/area/requisicion', icon: 'shopping_bag' },
          { label: 'Historial de Requisiciones', path: '/area/requisiciones/historial', icon: 'history' }
        ]
      },
      'urianalisis': { 
        label: 'Urianálisis', path: '/area/urianalisis', icon: 'science',
        children: [
          { label: 'Tablero de Control de Área', path: '/area/urianalisis', icon: 'dashboard_customize' },
          { label: 'Temperaturas', path: '/area/urianalisis/temperaturas', icon: 'device_thermostat' },
          { label: 'Inventario y Control de Calidad', path: '/area/urianalisis/inventario', icon: 'inventory_2' },
          { label: 'Acciones QC (FO-DO-012)', path: '/area/urianalisis/control-calidad', icon: 'fact_check' },
          { label: 'Solicitud de Material', path: '/almacen/nueva-solicitud', icon: 'add_shopping_cart' },
          { label: 'Histórico de Vales de Material', path: '/area/vales/historial', icon: 'history_edu' },
          { label: 'Nueva Requisición', path: '/area/requisicion', icon: 'shopping_bag' },
          { label: 'Historial de Requisiciones', path: '/area/requisiciones/historial', icon: 'history' }
        ]
      },
      'quimica_clinica': { 
        label: 'Química Clínica', path: '/area/quimica-clinica', icon: 'science',
        children: [
          { label: 'Tablero de Control de Área', path: '/area/quimica-clinica', icon: 'dashboard_customize' },
          { label: 'Temperaturas', path: '/area/quimica-clinica/temperaturas', icon: 'device_thermostat' },
          { label: 'Inventario y Control de Calidad', path: '/area/quimica-clinica/inventario', icon: 'inventory_2' },
          { label: 'Parámetros Derivados', path: '/area/quimica-clinica/derivados', icon: 'calculate' },
          { label: 'Bitácora de Maquilas', path: '/area/quimica-clinica/bitacora', icon: 'list_alt' },
          { label: 'Acciones QC (FO-DO-012)', path: '/area/quimica-clinica/control-calidad', icon: 'fact_check' },
          { label: 'Solicitud de Material', path: '/almacen/nueva-solicitud', icon: 'add_shopping_cart' },
          { label: 'Histórico de Vales de Material', path: '/area/vales/historial', icon: 'history_edu' },
          { label: 'Nueva Requisición', path: '/area/requisicion', icon: 'shopping_bag' },
          { label: 'Historial de Requisiciones', path: '/area/requisiciones/historial', icon: 'history' }
        ]
      },
      'serologia': { 
        label: 'Serología', path: '/area/serologia', icon: 'bloodtype',
        children: [
          { label: 'Tablero de Control de Área', path: '/area/serologia', icon: 'dashboard_customize' },
          { label: 'Temperaturas', path: '/area/serologia/temperaturas', icon: 'device_thermostat' },
          { label: 'Inventario y Control de Calidad', path: '/area/serologia/inventario', icon: 'inventory_2' },
          { label: 'Acciones QC (FO-DO-012)', path: '/area/serologia/control-calidad', icon: 'fact_check' },
          { label: 'Solicitud de Material', path: '/almacen/nueva-solicitud', icon: 'add_shopping_cart' },
          { label: 'Histórico de Vales de Material', path: '/area/vales/historial', icon: 'history_edu' },
          { label: 'Nueva Requisición', path: '/area/requisicion', icon: 'shopping_bag' },
          { label: 'Historial de Requisiciones', path: '/area/requisiciones/historial', icon: 'history' }
        ]
      },
      'toma_de_muestra': { label: 'Toma de Muestra', path: '/area/toma-muestra', icon: 'note_add' },
      'especiales': {
        label: 'Especiales', path: '/especiales', icon: 'labs',
        children: [
          { label: 'Dashboard', path: '/especiales', icon: 'dashboard_customize' },
          { label: 'Bitácora de Maquilas', path: '/especiales/bitacora', icon: 'labs' },
          { label: 'Costos y Conciliación', path: '/especiales/costos', icon: 'receipt_long' },
          { label: 'Pendientes de Resultado', path: '/especiales/pendientes', icon: 'pending_actions' },
          { label: 'Solicitar Vale (Interno)', path: '/almacen/nueva-solicitud', icon: 'add_shopping_cart' },
          { label: 'Historial de Vales', path: '/area/vales/historial', icon: 'history_edu' }
        ]
      },
    };

    if (areasConfig[r]) options.push(areasConfig[r]);
    if (r === 'recursos_humanos') {
      options.push({
        label: 'Recursos Humanos',
        path: '/area/recursos-humanos',
        icon: 'group',
        children: [
          { label: 'Portal RRHH', path: '/area/recursos-humanos', icon: 'dashboard' },
          { label: 'Calidad del Personal', path: '/area/recursos-humanos/evaluaciones', icon: 'fact_check' },
          { label: 'Dashboard NOM-035', path: '/area/recursos-humanos/evaluaciones/nom035', icon: 'analytics' },
          { label: 'Vídeo Certificados (Remotion)', path: '/area/recursos-humanos/certificados', icon: 'video_file' },
          { label: 'Responder Auto-Evaluación', path: '/nom035/evaluacion', icon: 'assignment' }
        ]
      });
    }
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
          <button className={styles.iconBtn} onClick={() => { setShowNotifMenu(!showNotifMenu); }}>
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
        <div className={styles.notifDropdown} style={{ width: '450px', maxWidth: '90vw' }}>
          <div className={styles.notifHeader}><h4>Notificaciones</h4></div>
          <div className={styles.notifList}>
            {allNotifications.map(n => (
              <div key={n.id} className={`${styles.notifItem} ${swipedNotifId === n.id ? styles.isSwiped : ''}`}
                onClick={() => {
                  if (n.isChat) {
                    window.dispatchEvent(new CustomEvent('open_chat_conversation', { detail: { sucursal: n.sucursal, canal: n.canal } }));
                    setShowNotifMenu(false);
                  }
                }}
                style={{ cursor: n.isChat ? 'pointer' : 'default' }}
              >
                <div 
                  className={styles.notifDot} 
                  style={{ 
                    backgroundColor: n.read ? '#94a3b8' : '#22c55e',
                    opacity: n.read ? 0.5 : 1,
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    markSingleAsRead(n.id, n.isChat);
                  }}
                  title={n.read ? "Leída" : "Marcar como leída"}
                ></div>
                <div><h4>{n.title}</h4><p>{n.message}</p></div>
              </div>
            ))}
            {allNotifications.length === 0 && <p className={styles.emptyNotif}>Sin avisos para hoy</p>}
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
