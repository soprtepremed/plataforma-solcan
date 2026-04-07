import { Routes, Route, Navigate } from 'react-router-dom';
import TopNavbar from './components/navigation/TopNavbar';
import Login from './pages/auth/Login';
import Captura from './pages/dashboard/Captura';
import ResultadosLista from './pages/dashboard/ResultadosLista';
import EnvioMuestras from './pages/dashboard/EnvioMuestras';
import LogisticaSede from './pages/dashboard/LogisticaSede';
import LogisticaAdmin from './pages/dashboard/LogisticaAdmin';
import MensajeroDashboard from './pages/dashboard/MensajeroDashboard';
import VerificacionMatriz from './pages/dashboard/VerificacionMatriz';
import LogisticaBitacora from './pages/dashboard/LogisticaBitacora';
import GestionMateriales from './pages/dashboard/GestionMateriales';
import AlmacenDashboard from './pages/dashboard/AlmacenDashboard';
import SolicitudMaterial from './pages/dashboard/SolicitudMaterial';
import ImpresionEtiquetas from './pages/dashboard/ImpresionEtiquetas';
import PortalPaciente from './pages/portal/PortalPaciente';
import Sucursales from './pages/Sucursales';
import { useAuth } from './context/AuthContext';
import './App.css';

// Componente para proteger las rutas internas
function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Layout con el Navbar (Solo se carga si el usuario entró)
function DashboardLayout({ children }) {
  return (
    <>
      <TopNavbar />
      <main className="main-content" style={{ paddingTop: '102px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </>
  );
}

function App() {
  const { user } = useAuth();

  return (
    <div className="app-container">
      <Routes>
        {/* Ruta Pública (No requiere sesión) */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        {/* Rutas Privadas (Protegidas, requieren sesión) */}
        <Route path="/" element={
           <PrivateRoute>
             <DashboardLayout>
               <Sucursales />
             </DashboardLayout>
           </PrivateRoute>
         } />

        {/* Core: Captura de Resultados */}
        <Route path="/captura" element={<PrivateRoute><DashboardLayout><Captura /></DashboardLayout></PrivateRoute>} />
        <Route path="/resultados" element={<PrivateRoute><DashboardLayout><ResultadosLista /></DashboardLayout></PrivateRoute>} />
        
        {/* Bio-Logística: Trazabilidad de Muestras */}
        <Route path="/logistica" element={<Navigate to="/logistica/bitacora" replace />} />
        <Route path="/logistica/admin" element={<PrivateRoute><DashboardLayout><LogisticaAdmin /></DashboardLayout></PrivateRoute>} />
        <Route path="/logistica/sede" element={<PrivateRoute><DashboardLayout><LogisticaSede /></DashboardLayout></PrivateRoute>} />
        <Route path="/logistica/envio" element={<PrivateRoute><DashboardLayout><EnvioMuestras /></DashboardLayout></PrivateRoute>} />
        <Route path="/logistica/transporte" element={<PrivateRoute><DashboardLayout><MensajeroDashboard /></DashboardLayout></PrivateRoute>} />
        <Route path="/logistica/recepcion" element={<PrivateRoute><DashboardLayout><VerificacionMatriz /></DashboardLayout></PrivateRoute>} />
        <Route path="/logistica/bitacora" element={<PrivateRoute><DashboardLayout><LogisticaBitacora /></DashboardLayout></PrivateRoute>} />
        <Route path="/logistica/materiales" element={<PrivateRoute><DashboardLayout><GestionMateriales /></DashboardLayout></PrivateRoute>} />
        <Route path="/logistica/impresion" element={<PrivateRoute><DashboardLayout><ImpresionEtiquetas /></DashboardLayout></PrivateRoute>} />
        
        <Route path="/pacientes" element={<PrivateRoute><DashboardLayout><h2 style={{padding: '3rem', textAlign: 'center', color:'var(--co-primary)'}}>Módulo de Recepción y Pacientes</h2></DashboardLayout></PrivateRoute>} />
        
        {/* Almacén e Inventario */}
        <Route path="/almacen" element={<Navigate to="/almacen/dashboard" replace />} />
        <Route path="/almacen/dashboard" element={<PrivateRoute><DashboardLayout><AlmacenDashboard /></DashboardLayout></PrivateRoute>} />
        <Route path="/almacen/solicitud" element={<PrivateRoute><DashboardLayout><SolicitudMaterial /></DashboardLayout></PrivateRoute>} />

        {/* Portal Público del Paciente (sin login) */}
        <Route path="/portal" element={<PortalPaciente />} />
        <Route path="/portal/:code" element={<PortalPaciente />} />
      </Routes>
    </div>
  );
}

export default App;
