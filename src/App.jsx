import { useState } from 'react';
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
import InventarioArea from './pages/dashboard/InventarioArea';
import ControlCalidadArea from './pages/dashboard/ControlCalidadArea';
import InventarioHemato from './pages/dashboard/InventarioHemato';
import NuevaRequisicion from './pages/dashboard/NuevaRequisicion';
import GestionRequisiciones from './pages/dashboard/GestionRequisiciones';
import HistorialRequisicionesArea from './pages/dashboard/HistorialRequisicionesArea';
import RelacionFoliosGeneral from './pages/dashboard/RelacionFoliosGeneral';
import PortalPacientes from './pages/PortalPacientes';

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
import AdminSidebar from './components/navigation/AdminSidebar';
import ChatWidget from './components/shared/ChatWidget';

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

// Guarda para Almacén e Inventario (Solo Almacén y Admin)
function WarehouseRoute({ children }) {
  const { user } = useAuth();
  const r = user?.role?.toLowerCase();
  const isAllowed = r === 'admin' || r === 'almacen';
  if (!isAllowed) return <Navigate to="/" replace />;
  return children;
}

// Guarda Genérica para Áreas Técnicas
function AreaRoute({ children, requiredRole }) {
  const { user } = useAuth();
  const r = user?.role?.toLowerCase() || '';
  
  // El admin tiene acceso total
  const isAdmin = r === 'admin' || r === 'administrador' || r === 'administración';
  
  // Soporte para múltiples roles permitidos
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const isAuthorized = allowedRoles.some(role => r === role.toLowerCase());

  if (!isAdmin && !isAuthorized) return <Navigate to="/" replace />;
  return children;
}

// Layout con el Navbar (Solo se carga si el usuario entró)
function DashboardLayout({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes('admin');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F8FAFC' }}>
      <TopNavbar />
      <div style={{ display: 'flex', flex: 1 }}>
        {isAdmin && (
          <AdminSidebar 
            collapsed={sidebarCollapsed} 
            setCollapsed={setSidebarCollapsed} 
          />
        )}
        <main 
          className="main-content" 
          style={{ 
            paddingTop: '32px', 
            marginTop: '72px',
            minHeight: 'calc(100vh - 72px)', 
            flex: 1,
            display: 'flex', 
            flexDirection: 'column',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            marginLeft: isAdmin ? (sidebarCollapsed ? '72px' : '260px') : '0',
            maxWidth: isAdmin ? (sidebarCollapsed ? 'calc(100vw - 72px)' : 'calc(100vw - 260px)') : '100vw'
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const { user } = useAuth();

  return (
    <div className="app-container">
      <Routes>
        {/* Rutas Públicas (No requieren sesión) */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/portal" element={<PortalPacientes />} />
        <Route path="/portal/:code" element={<PortalPacientes />} />

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
        <Route path="/logistica/relacion-folios" element={<PrivateRoute><DashboardLayout><RelacionFoliosGeneral /></DashboardLayout></PrivateRoute>} />
        <Route path="/logistica/impresion" element={<PrivateRoute><DashboardLayout><ImpresionEtiquetas /></DashboardLayout></PrivateRoute>} />
        
        <Route path="/pacientes" element={<PrivateRoute><DashboardLayout><h2 style={{padding: '3rem', textAlign: 'center', color:'var(--co-primary)'}}>Módulo de Recepción y Pacientes</h2></DashboardLayout></PrivateRoute>} />
        
        {/* Almacén e Inventario (Reestructurado) */}
        <Route path="/almacen" element={<Navigate to="/almacen/inventario" replace />} />
        <Route path="/almacen/inventario" element={<WarehouseRoute><DashboardLayout><InventarioGeneral /></DashboardLayout></WarehouseRoute>} />
        <Route path="/almacen/materiales" element={<WarehouseRoute><DashboardLayout><MaterialesCatalogo /></DashboardLayout></WarehouseRoute>} />
        <Route path="/almacen/solicitudes" element={<WarehouseRoute><DashboardLayout><SolicitudesSurtido /></DashboardLayout></WarehouseRoute>} />
        <Route path="/almacen/requisiciones" element={<WarehouseRoute><DashboardLayout><GestionRequisiciones /></DashboardLayout></WarehouseRoute>} />
        <Route path="/almacen/nueva-solicitud" element={<PrivateRoute><DashboardLayout><SolicitudMaterial /></DashboardLayout></PrivateRoute>} />
        <Route path="/almacen/proveedores" element={<WarehouseRoute><DashboardLayout><Proveedores /></DashboardLayout></WarehouseRoute>} />
        <Route path="/almacen/recepcion" element={<WarehouseRoute><DashboardLayout><RecepcionPedido /></DashboardLayout></WarehouseRoute>} />
        <Route path="/admin/promociones" element={
          <PrivateRoute>
            {user?.role?.toLowerCase().includes('admin') ? <DashboardLayout><AdminPromociones /></DashboardLayout> : <Navigate to="/" replace />}
          </PrivateRoute>
        } />

        {/* Áreas Modulares */}
        <Route path="/area/hematologia" element={<AreaRoute requiredRole="hematologia"><DashboardLayout><HematologiaDashboard /></DashboardLayout></AreaRoute>} />
        <Route path="/area/hematologia/inventario" element={<AreaRoute requiredRole="hematologia"><DashboardLayout><InventarioHemato /></DashboardLayout></AreaRoute>} />
        <Route path="/area/requisiciones/historial" element={<PrivateRoute><DashboardLayout><HistorialRequisicionesArea /></DashboardLayout></PrivateRoute>} />
        <Route path="/area/requisicion" element={<PrivateRoute><DashboardLayout><NuevaRequisicion /></DashboardLayout></PrivateRoute>} />
        
        {/* Inventario Universal por Área */}
        <Route path="/area/:areaId/inventario" element={<DashboardLayout><InventarioArea /></DashboardLayout>} />
        <Route path="/area/:areaId/control-calidad" element={<DashboardLayout><ControlCalidadArea /></DashboardLayout>} />

        <Route path="/area/urianalisis" element={<AreaRoute requiredRole="urianalisis"><DashboardLayout><UrianalisisDashboard /></DashboardLayout></AreaRoute>} />
        <Route path="/area/microbiologia" element={<AreaRoute requiredRole="microbiologia"><DashboardLayout><MicrobiologiaDashboard /></DashboardLayout></AreaRoute>} />
        <Route path="/area/toma-muestra" element={<AreaRoute requiredRole={['toma_de_muestra', 'recepcion']}><DashboardLayout><TomaMuestraDashboard /></DashboardLayout></AreaRoute>} />
        <Route path="/area/recepcion" element={<AreaRoute requiredRole="recepcion_area"><DashboardLayout><RecepcionDashboard /></DashboardLayout></AreaRoute>} />
        <Route path="/area/direccion-operativa" element={<AreaRoute requiredRole="direccion_operativa"><DashboardLayout><DireccionOperativaDashboard /></DashboardLayout></AreaRoute>} />
        <Route path="/area/recursos-humanos" element={<AreaRoute requiredRole="recursos_humanos"><DashboardLayout><RRHHDashboard /></DashboardLayout></AreaRoute>} />
        <Route path="/area/contabilidad" element={<AreaRoute requiredRole="contabilidad"><DashboardLayout><ContabilidadDashboard /></DashboardLayout></AreaRoute>} />
        <Route path="/area/quimica-clinica" element={<AreaRoute requiredRole="quimica_clinica"><DashboardLayout><QuimicaClinicaDashboard /></DashboardLayout></AreaRoute>} />

      </Routes>
      {user && <ChatWidget />}
    </div>
  );
}

export default App;
