import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminSidebar.module.css';

export default function AdminSidebar({ collapsed, setCollapsed }) {
  const { user } = useAuth();
  const location = useLocation();
  const [openMenus, setOpenMenus] = React.useState({});

  if (user?.role?.toLowerCase() !== 'admin') return null;

  const toggleMenu = (key) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const navGroups = [
    {
      title: 'OPERACIÓN',
      items: [
        { label: 'Inicio', path: '/', icon: 'home' },
        { label: 'Captura Resultados', path: '/captura', icon: 'add_task' },
        { label: 'Resultados Listos', path: '/resultados', icon: 'verified_user' },
      ]
    },
    {
      title: 'LOGÍSTICA',
      items: [
        { label: 'Recepción Matriz', path: '/logistica/recepcion', icon: 'lab_research' },
        { label: 'Bitácora FO-DO-017', path: '/logistica/bitacora', icon: 'assignment' },
        { label: 'Estado Sede', path: '/logistica/sede', icon: 'store' },
      ]
    },
    {
      title: 'INVENTARIO',
      items: [
        { 
          label: 'Almacén', 
          icon: 'inventory_2',
          key: 'almacen',
          children: [
            { label: 'Inventario Gral.', path: '/almacen/inventario' },
            { label: 'Materiales', path: '/almacen/materiales' },
            { label: 'Solicitudes', path: '/almacen/solicitudes' },
          ]
        },
        { 
          label: 'Proveedores', 
          icon: 'local_shipping',
          key: 'prov',
          children: [
            { label: 'Directorio', path: '/almacen/proveedores' },
            { label: 'Recepción Pedidos', path: '/almacen/recepcion' },
          ]
        },
      ]
    },
    {
      title: 'ÁREAS TÉCNICAS',
      items: [
        { label: 'Hematología', path: '/area/hematologia', icon: 'bloodtype' },
        { label: 'Microbiología', path: '/area/microbiologia', icon: 'biotech' },
        { label: 'Urianálisis', path: '/area/urianalisis', icon: 'science' },
        { label: 'Química Clínica', path: '/area/quimica-clinica', icon: 'chemistry' },
      ]
    }
  ];

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <button className={styles.toggleBtn} onClick={() => setCollapsed(!collapsed)}>
        <span className="material-symbols-rounded">
          {collapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      <div className={styles.scrollArea}>
        {navGroups.map((group, idx) => (
          <div key={idx} className={styles.group}>
            {!collapsed && <span className={styles.groupTitle}>{group.title}</span>}
            <div className={styles.groupItems}>
              {group.items.map(item => (
                <div key={item.label}>
                  {item.children ? (
                    <>
                      <button 
                        className={`${styles.navLink} ${openMenus[item.key] ? styles.menuOpen : ''} ${item.children.some(c => location.pathname === c.path) ? styles.active : ''}`}
                        onClick={() => toggleMenu(item.key)}
                      >
                        <span className="material-symbols-rounded">{item.icon}</span>
                        {!collapsed && <span className={styles.linkLabel}>{item.label}</span>}
                        {!collapsed && (
                          <span className={`${styles.arrow} material-symbols-rounded`}>
                            expand_more
                          </span>
                        )}
                      </button>
                      {openMenus[item.key] && !collapsed && (
                        <div className={styles.subMenu}>
                          {item.children.map(child => (
                            <NavLink 
                              key={child.path} 
                              to={child.path} 
                              className={({ isActive }) => `${styles.subNavLink} ${isActive ? styles.active : ''}`}
                            >
                              {child.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <NavLink 
                      to={item.path} 
                      className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                    >
                      <span className="material-symbols-rounded">{item.icon}</span>
                      {!collapsed && <span className={styles.linkLabel}>{item.label}</span>}
                    </NavLink>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
