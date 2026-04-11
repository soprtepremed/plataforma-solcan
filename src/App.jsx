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
import InventarioGeneral from './pages/dashboard/InventarioGeneral';
import MaterialesCatalogo from './pages/dashboard/MaterialesCatalogo';
import SolicitudesSurtido from './pages/dashboard/SolicitudesSurtido';
import SolicitudMaterial from './pages/dashboard/SolicitudMaterial';
import ImpresionEtiquetas from './pages/dashboard/ImpresionEtiquetas';
import Proveedores from './pages/dashboard/Proveedores';
import RecepcionPedido from './pages/dashboard/RecepcionPedido';
import AdminPromociones from './pages/dashboard/AdminPromociones';
import Sucursales from './pages/Sucursales';

// Áreas Modulares
import HematologiaDashboard from './pages/dashboard/areas/HematologiaDashboard';
import UrianalisisDashboard from './pages/dashboard/areas/UrianalisisDashboard';
import MicrobiologiaDashboard from './pages/dashboard/areas/MicrobiologiaDashboard';
import TomaMuestraDashboard from './pages/dashboard/areas/TomaMuestraDashboard';
import RecepcionDashboard from './pages/dashboard/areas/RecepcionDashboard';
import DireccionOperativaDashboard from './pages/dashboard/areas/DireccionOperativaDashboard';
import RRHHDashboard from './pages/dashboard/areas/RRHHDashboard';
import ContabilidadDashboard from './pages/dashboard/areas/ContabilidadDashboard';
import QuimicaClinicaDashboard from './pages/dashboard/areas/QuimicaClinicaDashboard';

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
        <Route path="/logistica/impresion" element={<PrivateRoute><DashboardLayout><ImpresionEtiquetas /></DashboardLayout></PrivateRoute>} />
        
        <Route path="/pacientes" element={<PrivateRoute><DashboardLayout><h2 style={{padding: '3rem', textAlign: 'center', color:'var(--co-primary)'}}>Módulo de Recepción y Pacientes</h2></DashboardLayout></PrivateRoute>} />
        
        {/* Almacén e Inventario (Reestructurado) */}
        <Route path="/almacen" element={<Navigate to="/almacen/inventario" replace />} />
        <Route path="/almacen/inventario" element={<PrivateRoute><DashboardLayout><InventarioGeneral /></DashboardLayout></PrivateRoute>} />
        <Route path="/almacen/materiales" element={<PrivateRoute><DashboardLayout><MaterialesCatalogo /></DashboardLayout></PrivateRoute>} />
        <Route path="/almacen/solicitudes" element={<PrivateRoute><DashboardLayout><SolicitudesSurtido /></DashboardLayout></PrivateRoute>} />
        <Route path="/almacen/nueva-solicitud" element={<PrivateRoute><DashboardLayout><SolicitudMaterial /></DashboardLayout></PrivateRoute>} />
        <Route path="/almacen/proveedores" element={<PrivateRoute><DashboardLayout><Proveedores /></DashboardLayout></PrivateRoute>} />
        <Route path="/almacen/recepcion" element={<PrivateRoute><DashboardLayout><RecepcionPedido /></DashboardLayout></PrivateRoute>} />
        <Route path="/admin/promociones" element={
          <PrivateRoute>
            {user?.role?.toLowerCase() === 'admin' ? <DashboardLayout><AdminPromociones /></DashboardLayout> : <Navigate to="/" replace />}
          </PrivateRoute>
        } />

        {/* Áreas Modulares */}
        <Route path="/area/hematologia" element={<PrivateRoute><DashboardLayout><HematologiaDashboard /></DashboardLayout></PrivateRoute>} />
        <Route path="/area/urianalisis" element={<PrivateRoute><DashboardLayout><UrianalisisDashboard /></DashboardLayout></PrivateRoute>} />
        <Route path="/area/microbiologia" element={<PrivateRoute><DashboardLayout><MicrobiologiaDashboard /></DashboardLayout></PrivateRoute>} />
        <Route path="/area/toma-muestra" element={<PrivateRoute><DashboardLayout><TomaMuestraDashboard /></DashboardLayout></PrivateRoute>} />
        <Route path="/area/recepcion" element={<PrivateRoute><DashboardLayout><RecepcionDashboard /></DashboardLayout></PrivateRoute>} />
        <Route path="/area/direccion-operativa" element={<PrivateRoute><DashboardLayout><DireccionOperativaDashboard /></DashboardLayout></PrivateRoute>} />
        <Route path="/area/recursos-humanos" element={<PrivateRoute><DashboardLayout><RRHHDashboard /></DashboardLayout></PrivateRoute>} />
        <Route path="/area/contabilidad" element={<PrivateRoute><DashboardLayout><ContabilidadDashboard /></DashboardLayout></PrivateRoute>} />
        <Route path="/area/quimica-clinica" element={<PrivateRoute><DashboardLayout><QuimicaClinicaDashboard /></DashboardLayout></PrivateRoute>} />

      </Routes>
    </div>
  );
}

export default App;
