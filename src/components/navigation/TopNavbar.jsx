import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import Cropper from 'react-easy-crop';
import styles from './TopNavbar.module.css';

export default function TopNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  // Estados para gestión de imagen y recorte
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifMenu(false);
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 📡 CANAL DE NOTIFICACIONES REALTIME
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      // Obtenemos el inicio del día local en formato ISO
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
    const ch = supabase.channel('notif_solcan').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload) => {
      const nuevo = payload.new;
      if (nuevo.role === user.role || nuevo.user_id === user.id) {
        setNotifications(prev => [nuevo, ...prev].slice(0, 15));
        playSample(user.role === 'mensajero' ? 'tritone' : 'note');
      }
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const playSample = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playFreq = (freq, start, duration, vol = 0.5) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + duration);
      };
      if (type === 'tritone') { playFreq(1174.66, 0, 0.2); playFreq(987.77, 0.15, 0.2); playFreq(783.99, 0.3, 0.4); }
      else { playFreq(1046.50, 0, 0.15); playFreq(1567.98, 0.1, 0.3); }
    } catch (err) { console.warn(err); }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({...n, read: true})));
    await supabase.from('notificaciones').update({ read: true }).eq('read', false).or(`role.eq.${user.role},user_id.eq.${user.id}`);
  };

  // 📷 Lógica de Recorte y Perfil
  const onFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = useCallback((area, pixels) => setCroppedAreaPixels(pixels), []);

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise(r => image.onload = r);
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width; canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return new Promise(r => canvas.toBlob(r, 'image/jpeg'));
  };

  const handleUpdateProfile = async () => {
    if (!image || !croppedAreaPixels) return;
    setIsUploading(true);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      const fileName = `profile_${user.id}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, croppedBlob);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: dbErr } = await supabase.from('empleados').update({ foto_url: publicUrl }).eq('id', user.id);
      if (dbErr) throw dbErr;
      updateUser({ foto_url: publicUrl });
      setImage(null);
      setShowProfileMenu(false);
      alert("¡Foto de perfil actualizada!");
    } catch (err) {
      console.error(err);
      alert("Error al subir foto: " + err.message);
    } finally { setIsUploading(false); }
  };

  const getMenuOptions = () => {
    if (!user?.role) return [];
    const r = user.role.toLowerCase();
    if (r.includes('admin')) return [ { label: 'Auditoría', path: '/logistica/admin', icon: 'assignment' }, { label: 'Matrices', path: '/logistica/recepcion', icon: 'check_circle' }, { label: 'Bitácora', path: '/logistica/bitacora', icon: 'fact_check' }, { label: 'Almacén', path: '/almacen/dashboard', icon: 'warehouse' } ];
    if (r === 'quimico') return [ { label: 'Recepción Matriz', path: '/logistica/recepcion', icon: 'biotech' }, { label: 'Bitácora', path: '/logistica/bitacora', icon: 'fact_check' }, { label: 'Solicitar Insumos', path: '/almacen/solicitud', icon: 'add_shopping_cart' } ];
    if (r === 'recepcion' || r === 'recepción') return [ { label: 'Preparar Envío', path: '/logistica/envio', icon: 'local_shipping' }, { label: 'Logística Sede', path: '/logistica/sede', icon: 'home_work' }, { label: 'Bitácora', path: '/logistica/bitacora', icon: 'fact_check' } ];
    if (r === 'mensajero' || r === 'chofer') return [ { label: 'Mi Ruta', path: '/logistica/transporte', icon: 'route' }, { label: 'Bitácora', path: '/logistica/bitacora', icon: 'fact_check' } ];
    if (r === 'captura') return [ { label: 'Subir Resultados', path: '/captura', icon: 'cloud_upload' }, { label: 'Lista Resultados', path: '/resultados', icon: 'list_alt' } ];
    return [];
  };

  const deleteNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notificaciones').delete().eq('id', id);
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
        <div className={styles.brand} onClick={() => navigate('/')}>
          <div className={styles.logoCircle}><img src="/favicon.png" alt="L" /></div>
          <span className={styles.brandName}>Solcan</span>
        </div>

        <div className={styles.navCenter}>
           {menuOptions.map(o => (
             <Link key={o.path} to={o.path} className={`${styles.navItem} ${location.pathname === o.path ? styles.active : ''}`}>
               <span className="material-symbols-rounded">{o.icon}</span>{o.label}
             </Link>
           ))}
        </div>

        <div className={styles.navActionsRight}>
          <div className={styles.notifArea}>
            <button className={styles.iconBtn} onClick={() => { setShowNotifMenu(!showNotifMenu); markAllAsRead(); }}>
              <span className="material-symbols-rounded">notifications</span>
              {unreadCount > 0 && <span className={styles.notifCircle}>{unreadCount}</span>}
            </button>
            {showNotifMenu && (
              <div className={styles.notifDropdown}>
                <div className={styles.notifHeader}>
                   <h4>Notificaciones</h4>
                   <button className={styles.clearBtn} onClick={() => setNotifications([])}>Limpiar Vista</button>
                </div>
                <div className={styles.notifList}>
                  {notifications.map(n => (
                    <div key={n.id} className={styles.notifItem}>
                      <div className={styles.notifDot}></div>
                      <div className={styles.notifTextContent}>
                         <div className={styles.notifUpper}>
                            <h4>{n.title}</h4>
                            <span className={styles.notifTime}>{formatNotifDate(n.created_at)}</span>
                         </div>
                         <p>{n.message}</p>
                         <button className={styles.deleteNotifBtn} onClick={() => deleteNotification(n.id)}>
                            <span className="material-symbols-rounded">close</span>
                         </button>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && <p className={styles.emptyNotif}>Sin avisos para hoy</p>}
                </div>
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
                     <h4>{user?.name}</h4>
                     <p>{user?.role}</p>
                  </div>
                  <div className={styles.profileItems}>
                     <label htmlFor="avatar-upload" className={styles.profileOption}>
                        <span className="material-symbols-rounded">add_a_photo</span>
                        Cambiar Foto de Perfil
                        <input type="file" id="avatar-upload" hidden accept="image/*" onChange={onFileChange} />
                     </label>
                     <div className={styles.profileDivider}></div>
                     <button onClick={logout} className={`${styles.profileOption} ${styles.logoutText}`}>
                        <span className="material-symbols-rounded">logout</span>
                        Cerrar Sesión
                     </button>
                  </div>
               </div>
             )}
          </div>

          <div className={styles.divider}></div>
          <div className={styles.controlIcons}>
            <button className={styles.iconBtn} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <span className="material-symbols-rounded">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE RECORTE (Cropper) */}
      {image && (
        <div className={styles.cropOverlay}>
           <div className={styles.cropModal}>
              <h3>Ajustar Foto</h3>
              <div className={styles.cropContainer}>
                <Cropper image={image} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
              </div>
              <div className={styles.cropActions}>
                 <button className={styles.cancelBtn} onClick={() => setImage(null)}>Cancelar</button>
                 <button className={styles.saveBtn} onClick={handleUpdateProfile} disabled={isUploading}>
                   {isUploading ? 'Gurdando...' : 'Establecer Foto'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MENÚ MÓVIL */}
      {mobileMenuOpen && (
        <div className={styles.mobileOverlay}>
           <div className={styles.mobileProfileHeader}>
              <div className={styles.mobileAvatarLarge}>
                 {user?.foto_url ? <img src={user.foto_url} alt="U" /> : <span>{user?.name?.charAt(0)}</span>}
              </div>
              <div><h4>{user?.name}</h4><p>{user?.role}</p></div>
           </div>
           <div className={styles.mobileMenuList}>
              {menuOptions.map(o => (
                <Link key={o.path} to={o.path} className={styles.mobileItem} onClick={() => setMobileMenuOpen(false)}>
                  <span className="material-symbols-rounded">{o.icon}</span>{o.label}
                </Link>
              ))}
              <div className={styles.mobileDivider}></div>
              <button onClick={logout} className={styles.mobileLogoutBtn}>
                 <span className="material-symbols-rounded">logout</span>Cerrar Sesión
              </button>
           </div>
        </div>
      )}
    </nav>
  );
}
