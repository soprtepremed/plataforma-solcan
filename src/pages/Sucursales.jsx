import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './Sucursales.module.css';

const Sucursales = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Fecha actual formateada para el Hero
    const today = new Date().toLocaleDateString('es-MX', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    });

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
            <header className={styles.welcomeHeader}>
                <div className={styles.dateLabel}>{today}</div>
                <h1>¡Hola, {user?.sucursal || user?.branch || user?.name.split(' ')[0]}!</h1>
                <p>Bienvenido al Panel de Control de <strong>Solcan Lab</strong>. ¿En qué trabajaremos hoy?</p>
            </header>

            <div className={styles.cardGrid}>
                {quickActions.map((action) => (
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