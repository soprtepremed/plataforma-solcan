import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './Sucursales.module.css';

const Sucursales = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Definición de acciones rápidas por rol
    const getQuickActions = () => {
        if (!user) return [];

        const actions = [];

        if (user.role === 'admin' || user.role === 'recepcion') {
            actions.push({
                title: 'Logística de Sucursal',
                desc: 'Gestionar envíos de muestras y hieleras.',
                icon: 'local_shipping',
                path: '/logistica/sede'
            });
        }

        if (user.role === 'admin' || user.role === 'captura') {
            actions.push({
                title: 'Subir Resultados',
                desc: 'Cargar archivos PDF y validar resultados.',
                icon: 'upload_file',
                path: '/captura'
            });
        }

        if (user.role === 'admin' || user.role === 'captura') {
            actions.push({
                title: 'Historial Clínico',
                desc: 'Búsqueda y consulta de resultados anteriores.',
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
                title: 'Gestión de Materiales',
                desc: 'Control de reactivos e insumos por área técnica.',
                icon: 'inventory_2',
                path: '/logistica/materiales'
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
                <h1>¡Hola, {user?.name.split(' ')[0]}!</h1>
                <p>Bienvenido al Panel de Control de <strong>Solcan Lab</strong>. ¿En qué trabajaremos hoy?</p>
            </header>

            <div className={styles.cardGrid}>
                {quickActions.map((action, i) => (
                    <div 
                        key={i} 
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
                            Acceder <span className="material-symbols-rounded" style={{fontSize: '16px'}}>arrow_forward_ios</span>
                        </div>
                    </div>
                ))}
            </div>

            <footer className={styles.supportFooter}>
                <div className={styles.supportInfo}>
                    <span className="material-symbols-rounded">help_outline</span>
                    <div className={styles.supportMsg}>
                        <h4>¿Necesitas asistencia técnica?</h4>
                        <p>Nuestro equipo de soporte está disponible para ayudarte con el uso de la plataforma.</p>
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