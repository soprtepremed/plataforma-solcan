import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';
import styles from './TopNavbar.module.css';

export default function TopNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // Importar usuario actual y accion cerrar sesion

  // Lógica Dinámica de Roles (Fase 3)
  const getMenuOptions = () => {
    // Si no hay usuario, retorna nada
    if (!user) return [];
    
    // Todos ven el inicio
    const commonOpts = [{ label: 'Dashboards', path: '/' }];
    
    if (user.role === 'admin') {
      return [
        ...commonOpts,
        { label: 'Subir Resultados', path: '/captura' },
        { label: 'Historial de Pacientes', path: '/resultados' },
        { label: 'Recepción Matriz', path: '/logistica/recepcion' },
        { label: 'Auditoría Logística', path: '/logistica/admin' },
        { label: 'Almacén', path: '/almacen' }
      ];
    } else if (user.role === 'captura') {
      return [
        ...commonOpts,
        { label: 'Subir Resultados', path: '/captura' },
        { label: 'Historial', path: '/resultados' }
      ];
    } else if (user.role === 'recepcion') {
      return [
        ...commonOpts,
        { label: 'Logística de Sucursal', path: '/logistica/sede' },
        { label: 'Pacientes', path: '/pacientes' }
      ];
    } else if (user.role === 'mensajero') {
      return [
        ...commonOpts,
        { label: 'Transporte de Muestras', path: '/logistica/transporte' }
      ];
    }
    return commonOpts;
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
          <span style={{ fontSize: '0.80rem', fontWeight: 600, marginRight: '10px' }} className={styles.stripeLinks}>
            Hola, {user?.name.split(' ')[0]} 
            <span style={{ color: 'var(--co-accent)', marginLeft: '8px', paddingLeft: '8px', borderLeft: '1.5px solid #E2E8F0' }}>
              📍 {user?.branch}
            </span>
          </span>
          <span className={`material-symbols-rounded ${styles.iconBtn}`}>
            search
          </span>
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
