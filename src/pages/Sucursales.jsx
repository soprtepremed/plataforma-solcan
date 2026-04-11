import React, { useState, useEffect, useMemo, useDeferredValue, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import styles from './Sucursales.module.css';

// Categorías para el dashboard
const areas = ['Todos', 'Hematología', 'Química Clínica', 'Uroanálisis', 'Microbiología', 'Papelería', 'Otros'];

// Componentes Memolizados para máximo rendimiento
const DashHeader = memo(({ today, userName }) => (
    <header className={styles.welcomeHeader}>
        <div className={styles.dateLabel}>{today}</div>
        <h1>¡Hola, {userName}!</h1>
        <p>Bienvenido al Panel de Control de <strong>Solcan Lab</strong>. ¿En qué trabajaremos hoy?</p>
    </header>
));

const FilterBar = memo(({ areas, activeArea, onAreaChange }) => (
    <div className={styles.dashFilters}>
        {areas.map(a => (
            <button 
                key={a} 
                className={`${styles.areaPill} ${activeArea === a ? styles.areaPillActive : ''}`}
                onClick={() => onAreaChange(a)}
            >
                {a}
            </button>
        ))}
    </div>
));

const QuickActions = memo(({ actions, navigate }) => (
    <div className={styles.cardGrid}>
        {actions.map((action) => (
            <div 
                key={action.path} 
                className={styles.actionCard} 
                onClick={() => navigate(action.path)}
            >
                <div className={styles.cardIcon}>
                    <span className="material-symbols-rounded">{action.icon}</span>
                </div>
                <div className={styles.cardContent}>
                    <h3>{action.title}</h3>
                    <p>{action.desc}</p>
                </div>
                <div className={styles.cardArrow}>
                    Explorar <span className="material-symbols-rounded">arrow_forward</span>
                </div>
            </div>
        ))}
    </div>
));

const Sucursales = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [inventoryData, setInventoryData] = useState({ catalog: [], units: [] });
    const [activeArea, setActiveArea] = useState('Todos');
    
    const deferredArea = useDeferredValue(activeArea);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('v_inventario_panoramico').select('*');
            setInventoryData({ catalog: data || [], units: [] });
        } catch (err) {
            console.error("Error dashboard:", err);
        } finally {
            setLoading(false);
        }
    };

    const alerts = useMemo(() => {
        const { catalog } = inventoryData;
        const now = new Date();
        const fortyFiveDaysLater = new Date();
        fortyFiveDaysLater.setDate(now.getDate() + 45);

        const filtered = catalog.filter(c => 
            deferredArea === 'Todos' || 
            c.area_tecnica === deferredArea.toUpperCase() ||
            (deferredArea === 'Otros' && !['HEMATOLOGÍA', 'QUÍMICA CLÍNICA', 'UROANÁLISIS', 'MICROBIOLOGÍA', 'PAPELERÍA'].includes(c.area_tecnica))
        );

        const lowStock = filtered.filter(c => c.stock_real <= (c.stock_minimo || 0));

        const expiring = filtered.filter(c => {
            if (!c.proxima_caducidad) return false;
            const cad = new Date(c.proxima_caducidad);
            return cad <= fortyFiveDaysLater && cad >= now;
        });

        return { lowStock, expiring };
    }, [inventoryData, deferredArea]);

    const today = useMemo(() => new Date().toLocaleDateString('es-MX', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    }), []);

    // Definición de acciones rápidas por rol
    const getQuickActions = () => {
        if (!user) return [];

        const actions = [];

        if (user.role === 'admin' || user.role === 'recepcion') {
            actions.push({
                title: 'Logística de Sucursal',
                desc: 'Gestionar envíos de muestras y hieleras en tiempo real.',
                icon: 'local_shipping',
                path: '/logistica/sede'
            });
        }

        if (user.role === 'admin' || user.role === 'captura') {
            actions.push({
                title: 'Subir Resultados',
                desc: 'Cargar archivos PDF y validar resultados clínicos.',
                icon: 'upload_file',
                path: '/captura'
            });
            actions.push({
                title: 'Historial Clínico',
                desc: 'Búsqueda y consulta de resultados anteriores de pacientes.',
                icon: 'history',
                path: '/resultados'
            });
        }

        if (user.role === 'admin' || user.role === 'quimico') {
            actions.push({
                title: 'Recepción Matriz',
                desc: 'Verificar arribo de muestras en Laboratorio Central.',
                icon: 'home_health',
                path: '/logistica/recepcion'
            });
            actions.push({
                title: 'Bitácora FO-DO-017',
                desc: 'Seguimiento legal de la recepción de muestras.',
                icon: 'assignment',
                path: '/logistica/bitacora'
            });
            actions.push({
                title: 'Solicitud de Insumos',
                desc: 'Solicitar reactivos y materiales eligiendo lotes específicos.',
                icon: 'shopping_cart',
                path: '/almacen/nueva-solicitud'
            });
        }

        if (user.role === 'admin') {
            actions.push({
                title: 'Auditoría Logística',
                desc: 'Seguimiento global de la cadena de custodia.',
                icon: 'analytics',
                path: '/logistica/admin'
            });
        }

        if (user.role === 'admin' || user.role === 'almacen') {
            actions.push({
                title: 'Inventario General',
                desc: 'Control de stock, alertas y cantidades totales por categoría.',
                icon: 'grid_view',
                path: '/almacen/inventario'
            });
            actions.push({
                title: 'Materiales',
                desc: 'Gestión de catálogo, alta de nuevos insumos e importación masiva.',
                icon: 'category',
                path: '/almacen/materiales'
            });
            actions.push({
                title: 'Solicitudes de Material',
                desc: 'Surtido y despacho de vales pendientes para las sedes.',
                icon: 'assignment_turned_in',
                path: '/almacen/solicitudes'
            });
        }

        if (user.role === 'mensajero') {
            actions.push({
                title: 'Transporte de Muestras',
                desc: 'Panel de recolección y entrega para choferes.',
                icon: 'conveyor_belt',
                path: '/logistica/transporte'
            });
        }

        return actions;
    };

    const quickActions = getQuickActions();

    return (
        <div className={styles.homeContainer}>
            <DashHeader today={today} userName={user?.sucursal || user?.branch || user?.name.split(' ')[0]} />

            {(user?.role === 'admin' || user?.role === 'almacen') && (
                <section className={styles.inventoryDashboard}>
                    <div className={styles.dashHeader}>
                        <div className={styles.dashTitle}>
                            <span className="material-symbols-rounded">analytics</span>
                            <div>
                                <h2>Monitor de Inventario</h2>
                                <p>Control preventivo de stock y caducidad</p>
                            </div>
                        </div>
                        <FilterBar areas={areas} activeArea={activeArea} onAreaChange={setActiveArea} />
                    </div>

                    <div className={styles.alertCards}>
                        <div className={`${styles.alertCard} ${alerts.expiring.length > 0 ? styles.critical : ''}`}>
                            <div className={styles.alertIcon}>
                                <span className="material-symbols-rounded">event_busy</span>
                            </div>
                            <div className={styles.alertInfo}>
                                <h3>{alerts.expiring.length}</h3>
                                <p>Próximos a Caducar</p>
                            </div>
                        </div>
                        <div className={`${styles.alertCard} ${alerts.lowStock.length > 0 ? styles.warning : ''}`}>
                            <div className={styles.alertIcon}>
                                <span className="material-symbols-rounded">inventory_2</span>
                            </div>
                            <div className={styles.alertInfo}>
                                <h3>{alerts.lowStock.length}</h3>
                                <p>Materiales con Stock Bajo</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.alertDetails}>
                        {alerts.expiring.length > 0 && (
                            <div className={styles.alertListSection}>
                                <h4>Materiales venciendo pronto:</h4>
                                <div className={styles.miniAlertList}>
                                    {alerts.expiring.slice(0, 3).map(c => (
                                        <div key={c.id} className={styles.miniAlertItem}>
                                            <span className="material-symbols-rounded" style={{color: '#f56565'}}>warning</span>
                                            <div className={styles.miniText}>
                                                <strong>{c.nombre}</strong>
                                                <span>Vence: {new Date(c.proxima_caducidad).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {alerts.expiring.length > 3 && <span className={styles.moreLink} onClick={() => navigate('/almacen/inventario')}>Y {alerts.expiring.length - 3} más...</span>}
                                </div>
                            </div>
                        )}
                        {alerts.lowStock.length > 0 && (
                            <div className={styles.alertListSection}>
                                <h4>Stock por debajo del mínimo:</h4>
                                <div className={styles.miniAlertList}>
                                    {alerts.lowStock.slice(0, 3).map(c => (
                                        <div key={c.id} className={styles.miniAlertItem}>
                                            <span className="material-symbols-rounded" style={{color: '#ed8936'}}>error</span>
                                            <div className={styles.miniText}>
                                                <strong>{c.nombre}</strong>
                                                <span>Añadir pedido urgente</span>
                                            </div>
                                        </div>
                                    ))}
                                    {alerts.lowStock.length > 3 && <span className={styles.moreLink} onClick={() => navigate('/almacen/inventario')}>Y {alerts.lowStock.length - 3} más...</span>}
                                </div>
                            </div>
                        )}
                        {alerts.expiring.length === 0 && alerts.lowStock.length === 0 && (
                            <div className={styles.allCorrect}>
                                <span className="material-symbols-rounded">check_circle</span>
                                <p>Todo en orden en {activeArea === 'Todos' ? 'todas las áreas' : `el área de ${activeArea}`}</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <QuickActions actions={quickActions} navigate={navigate} />

            <footer className={styles.supportFooter}>
                <div className={styles.supportInfo}>
                    <span className="material-symbols-rounded">support_agent</span>
                    <div className={styles.supportMsg}>
                        <h4>¿Necesitas asistencia técnica?</h4>
                        <p>Nuestro equipo de expertos está disponible para guiarte.</p>
                    </div>
                </div>
                <button 
                  className={styles.supportBtn}
                  onClick={() => alert('Soporte Solcan: soporte@solcanlab.com')}
                >
                    Contactar Soporte
                </button>
            </footer>
        </div>
    );
};

export default Sucursales;