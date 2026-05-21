import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './ProgramaMantenimiento.module.css';
import { supabase } from '../../lib/supabaseClient';

const SUCURSALES_LIST = [
  { id: 'matriz', name: 'Matriz', desc: 'Laboratorio Central y Sede de Operaciones' },
  { id: 'crae', name: 'CRAE', desc: 'Hospital de Especialidades Pediátricas' },
  { id: 'tapachula', name: 'Tapachula', desc: 'Sucursal Frontera Sur' },
  { id: 'sancristobal', name: 'San Cristóbal', desc: 'Sucursal Los Altos de Chiapas' },
  { id: 'comitan', name: 'Comitán', desc: 'Sucursal Región Fronteriza' },
  { id: 'arriaga', name: 'Arriaga', desc: 'Sucursal Región Istmo-Costa' },
  { id: 'pijijiapan', name: 'Pijijiapan', desc: 'Sucursal Región Costa' },
  { id: 'palenque', name: 'Palenque', desc: 'Sucursal Región Selva' },
  { id: 'limon', name: 'Limón', desc: 'Sucursal Región Limón' },
  { id: 'campestre', name: 'Campestre', desc: 'Sucursal Zona Campestre' },
  { id: 'chiapadecorzo', name: 'Chiapa de Corzo', desc: 'Sucursal Histórica Chiapa de Corzo' },
  { id: 'cedros', name: 'Cedros', desc: 'Sucursal Los Cedros' }
];

// Initial Mock Data with branch assignment (sucursal)
const INITIAL_EQUIPMENT = [
  { id: 'EQ-001', nombre: 'Analizador Hematológico Sysmex XN-1000', marca: 'Sysmex', modelo: 'XN-1000', serie: 'SYSMEX-99812', area: 'HEMATOLOGÍA', frecuencia: 'Mensual', ultimoManto: '2026-04-20', proximoManto: '2026-05-20', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-002', nombre: 'Analizador de Química Clínica Vitros 4600', marca: 'Ortho Clinical', modelo: 'Vitros 4600', serie: 'VITROS-4600-X3', area: 'QUÍMICA CLÍNICA', frecuencia: 'Trimestral', ultimoManto: '2026-02-10', proximoManto: '2026-05-10', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-003', nombre: 'Gasómetro ABL90 Flex', marca: 'Radiometer', modelo: 'ABL90', serie: 'ABL90-8871', area: 'HEMATOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2025-11-20', proximoManto: '2026-05-20', sucursal: 'Tapachula', estatus: 'Activo' },
  { id: 'EQ-004', nombre: 'Centrífuga Beckman Coulter', marca: 'Beckman Coulter', modelo: 'Allegra X-30', serie: 'BECK-ALLEGRA-12', area: 'QUÍMICA CLÍNICA', frecuencia: 'Anual', ultimoManto: '2025-08-10', proximoManto: '2026-08-10', sucursal: 'Tapachula', estatus: 'Activo' },
  { id: 'EQ-005', nombre: 'Autoclave Vertical Tuttnauer', marca: 'Tuttnauer', modelo: '3870ELV', serie: 'TUTT-3870-19', area: 'MICROBIOLOGÍA', frecuencia: 'Trimestral', ultimoManto: '2026-03-01', proximoManto: '2026-06-01', sucursal: 'San Cristóbal', estatus: 'Activo' },
  { id: 'EQ-006', nombre: 'Analizador de Orina Aution Max', marca: 'Arkray', modelo: 'AX-4030', serie: 'ARK-AUTION-09', area: 'UROANÁLISIS', frecuencia: 'Trimestral', ultimoManto: '2026-04-05', proximoManto: '2026-07-05', sucursal: 'Comitán', estatus: 'Activo' },
  { id: 'EQ-007', nombre: 'Microscopio Binocular Olympus CX31', marca: 'Olympus', modelo: 'CX31', serie: 'OLY-CX31-778', area: 'HEMATOLOGÍA', frecuencia: 'Anual', ultimoManto: '2025-06-15', proximoManto: '2026-06-15', sucursal: 'Tapachula', estatus: 'Activo' },
  { id: 'EQ-008', nombre: 'Incubadora Microbiológica Binder', marca: 'Binder', modelo: 'BD 56', serie: 'BINDER-BD-109', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2025-12-10', proximoManto: '2026-06-10', sucursal: 'CRAE', estatus: 'Activo' },
  { id: 'EQ-009', nombre: 'Baño María Memmert', marca: 'Memmert', modelo: 'WNB 7', serie: 'MEM-WNB-55', area: 'QUÍMICA CLÍNICA', frecuencia: 'Anual', ultimoManto: '2025-09-01', proximoManto: '2026-09-01', sucursal: 'Palenque', estatus: 'Activo' },
  // Equipos del área de Microbiología solicitados por el usuario
  { id: 'EQ-TEM-MERC-05', nombre: 'Termómetro de Líquido en Vidrio alcance de 110 °C', marca: 'Genérico', modelo: '110 °C', serie: 'Sin Serie', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-04-10', proximoManto: '2026-10-10', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-MIC-002', nombre: 'Centrífuga Ultra 8T (LW Scientific)', marca: 'LW Scientific', modelo: 'Ultra 8T', serie: 'F33D1000062', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-03-15', proximoManto: '2026-09-15', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-MIC-004', nombre: 'Microscopio CX31 RBSFA (Olympus)', marca: 'Olympus', modelo: 'CX31 RBSFA', serie: '6D32271', area: 'MICROBIOLOGÍA', frecuencia: 'Anual', ultimoManto: '2026-01-20', proximoManto: '2027-01-20', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-MIC-007', nombre: 'Microscan Autoscan4 (Beckman Coulter)', marca: 'Beckman Coulter', modelo: 'Autoscan4', serie: '9513', area: 'MICROBIOLOGÍA', frecuencia: 'Trimestral', ultimoManto: '2026-04-05', proximoManto: '2026-07-05', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-MIC-001-1', nombre: 'BT24 Block Chain', marca: 'Genérico', modelo: 'BT24', serie: '202406024BT24', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-02-10', proximoManto: '2026-08-10', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-MIC-001-2', nombre: 'Cabina de Seguridad Nuaire UN-126-400', marca: 'Nuaire', modelo: 'UN-126-400', serie: '126158093008', area: 'MICROBIOLOGÍA', frecuencia: 'Trimestral', ultimoManto: '2026-03-01', proximoManto: '2026-06-01', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-MIC-008', nombre: 'Estufa de Cultivo Riossa', marca: 'Riossa', modelo: 'ECML', serie: 'Sin Serie', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-02-28', proximoManto: '2026-08-28', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-MIC-018', nombre: 'Microscopio CX31 RBSFA (Olympus)', marca: 'Olympus', modelo: 'CX31 RBSFA', serie: '6D11524', area: 'MICROBIOLOGÍA', frecuencia: 'Anual', ultimoManto: '2025-11-15', proximoManto: '2026-11-15', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-MIC-012', nombre: 'Enfriador Vertical CV-14', marca: 'Genérico', modelo: 'CV-14', serie: 'LO7-1908', area: 'MICROBIOLOGÍA', frecuencia: 'Anual', ultimoManto: '2025-08-20', proximoManto: '2026-08-20', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'INV-DEN-001', nombre: 'Densitómetro 001', marca: 'Genérico', modelo: 'Densitómetro', serie: 'Sin Serie', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-03-10', proximoManto: '2026-09-10', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'INV-DENS-002', nombre: 'Densitómetro 002', marca: 'Genérico', modelo: 'Densitómetro', serie: 'Sin Serie', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-03-12', proximoManto: '2026-09-12', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-MIC-005', nombre: 'Vortex Maxi Mix II', marca: 'Genérico', modelo: 'Maxi Mix II', serie: '18610181153028', area: 'MICROBIOLOGÍA', frecuencia: 'Anual', ultimoManto: '2025-10-05', proximoManto: '2026-10-05', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-TEM-003', nombre: 'Termómetro de Líquido en Vidrio alcance de 110 °C', marca: 'Genérico', modelo: '110 °C', serie: 'Sin Serie', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-04-12', proximoManto: '2026-10-12', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'EQ-MIC-003', nombre: 'Thermostat Water Bath HH-2', marca: 'Genérico', modelo: 'HH-2', serie: 'Sin Serie', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-01-15', proximoManto: '2026-07-15', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'INV-OPTH-002', nombre: 'Termohidrómetro CEM DT-172', marca: 'CEM', modelo: 'DT-172', serie: 'Sin Serie', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-02-18', proximoManto: '2026-08-18', sucursal: 'Matriz', estatus: 'Activo' },
  // Nuevos Equipos solicitados (Climas Midea)
  { id: 'INV-CLI-029', nombre: 'Aire Acondicionado Midea', marca: 'Midea', modelo: '12CDLA', serie: 'D212303630114C18120609', area: 'HEMATOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-03-10', proximoManto: '2026-09-10', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'INV-CLI-030', nombre: 'Aire Acondicionado Midea', marca: 'Midea', modelo: '12CDLA', serie: 'D212303630314C25120060', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-03-12', proximoManto: '2026-09-12', sucursal: 'Matriz', estatus: 'Activo' },
  { id: 'INV-FUM-001', nombre: 'Fumigación (Control de Plagas)', marca: 'Genérico', modelo: 'Servicio Periódico', serie: 'Sin Serie', area: 'MICROBIOLOGÍA', frecuencia: 'Semestral', ultimoManto: '2026-05-15', proximoManto: '2026-11-15', sucursal: 'Matriz', estatus: 'Activo' }
];

const INITIAL_TICKETS = [
  { id: 'TKT-101', equipoId: 'EQ-006', equipoNombre: 'Analizador de Orina Aution Max', area: 'UROANÁLISIS', reportadoPor: 'Mtra. Lucía Pérez', fecha: '2026-05-18', falla: 'El lector óptico no detecta las tiras reactivas de manera intermitente, muestra error en código de barras.', urgencia: 'Alta', estado: 'Pendiente', sucursal: 'Comitán' },
  { id: 'TKT-102', equipoId: 'EQ-003', equipoNombre: 'Gasómetro ABL90 Flex', area: 'HEMATOLOGÍA', reportadoPor: 'Dr. Fernando Gómez', fecha: '2026-05-19', falla: 'El brazo mecánico tiene juego y no succiona correctamente la muestra de sangre capilar.', urgencia: 'Media', estado: 'En Proceso', sucursal: 'Tapachula' },
  { id: 'TKT-103', equipoId: 'EQ-002', equipoNombre: 'Analizador de Química Clínica Vitros 4600', area: 'QUÍMICA CLÍNICA', reportadoPor: 'Q.F.B. Javier Ruiz', fecha: '2026-05-20', falla: 'El sistema marca baja presión de agua en la bomba de desecho durante el ciclo de autolimpieza.', urgencia: 'Alta', estado: 'Pendiente', sucursal: 'Matriz' }
];

const INITIAL_HISTORY = [
  // ── Enero 2026 ──────────────────────────────────────────────────────────
  { id: 'HS-101', equipoId: 'EQ-MIC-002', equipoNombre: 'Centrífuga Ultra 8T (LW Scientific)', tipo: 'Preventivo', subtipo: 'Mantenimiento', fecha: '2026-01-15', realizadoPor: 'Ing. Rafael Torres (LW Scientific)', costo: 1800, observaciones: 'Mantenimiento preventivo semestral. Lubricación de rodamientos, limpieza del rotor y verificación de velocidades con tacómetro certificado. Equipo en óptimas condiciones.', sucursal: 'Matriz', evidenciaNombre: 'reporte_centrifuga_ene2026.pdf', evidenciaUrl: '#' },
  { id: 'HS-102', equipoId: 'EQ-MIC-001-2', equipoNombre: 'Cabina de Seguridad Nuaire UN-126-400', tipo: 'Preventivo', subtipo: 'Calibración', fecha: '2026-01-22', realizadoPor: 'Tec. Certificado Ambiental Humberto Díaz', costo: 3500, observaciones: 'Calibración anual de flujo laminar. Prueba de integridad de filtros HEPA, medición de velocidad de aire (0.45 m/s ± 20%) y prueba de humo. Certificado ASHRAE 110 emitido.', sucursal: 'Matriz', evidenciaNombre: 'certificado_cabina_bioseguridad_ene2026.pdf', evidenciaUrl: '#' },

  // ── Febrero 2026 ─────────────────────────────────────────────────────────
  { id: 'HS-103', equipoId: 'INV-OPTH-002', equipoNombre: 'Termohidrómetro CEM DT-172', tipo: 'Preventivo', subtipo: 'Verificación', fecha: '2026-02-10', realizadoPor: 'Q.F.B. Adriana Solís', costo: 0, observaciones: 'Verificación interna de parámetros operativos. Comparación contra termómetro de referencia NIST. Deriva: +0.2°C — dentro del límite de aceptación (±0.5°C). Aprobado.', sucursal: 'Matriz', evidenciaNombre: 'registro_verificacion_termohidrometro_feb2026.pdf', evidenciaUrl: '#' },
  { id: 'HS-104', equipoId: 'EQ-MIC-001-1', equipoNombre: 'BT24 Block Chain', tipo: 'Preventivo', subtipo: 'Mantenimiento', fecha: '2026-02-18', realizadoPor: 'Tec. Interno Luis Cárdenas', costo: 250, observaciones: 'Mantenimiento preventivo. Limpieza de placa calefactora, revisión de contactos eléctricos y ajuste de temperatura. Funcionamiento verificado a 37°C ± 0.5°C.', sucursal: 'Matriz', evidenciaNombre: null, evidenciaUrl: null },

  // ── Marzo 2026 ────────────────────────────────────────────────────────────
  { id: 'HS-105', equipoId: 'EQ-MIC-001-2', equipoNombre: 'Cabina de Seguridad Nuaire UN-126-400', tipo: 'Preventivo', subtipo: 'Mantenimiento', fecha: '2026-03-05', realizadoPor: 'Tec. Interno Jorge Espinoza', costo: 380, observaciones: 'Mantenimiento preventivo trimestral. Limpieza de superficies internas con alcohol isopropílico, revisión de luz UV y verificación de alarmas de flujo. Sin anomalías.', sucursal: 'Matriz', evidenciaNombre: 'mto_cabina_mar2026.jpg', evidenciaUrl: '#' },
  { id: 'HS-106', equipoId: 'INV-DEN-001', equipoNombre: 'Densitómetro 001', tipo: 'Preventivo', subtipo: 'Calibración', fecha: '2026-03-20', realizadoPor: 'Proveedor Externo DensiTech México', costo: 2200, observaciones: 'Calibración externa anual con estándares trazables a CENAM. Curva de calibración validada en rango 0.00–3.50 Abs. Incertidumbre: ±0.005 Abs. Certificado #DT-2026-0318 emitido.', sucursal: 'Matriz', evidenciaNombre: 'certificado_densitometro_001_mar2026.pdf', evidenciaUrl: '#' },
  { id: 'HS-107', equipoId: 'EQ-MIC-008', equipoNombre: 'Estufa de Cultivo Riossa', tipo: 'Preventivo', subtipo: 'Verificación', fecha: '2026-03-28', realizadoPor: 'Q.F.B. Adriana Solís', costo: 0, observaciones: 'Verificación de temperatura por zona (superior, media, inferior) con termómetro de referencia certificado. Uniformidad ≤ 1°C. Todas las zonas dentro de especificación a 37°C. Aprobado.', sucursal: 'Matriz', evidenciaNombre: 'verificacion_estufa_mar2026.pdf', evidenciaUrl: '#' },

  // ── Abril 2026 ────────────────────────────────────────────────────────────
  { id: 'HS-108', equipoId: 'EQ-001', equipoNombre: 'Analizador Hematológico Sysmex XN-1000', tipo: 'Preventivo', subtipo: 'Mantenimiento', fecha: '2026-04-20', realizadoPor: 'Ing. Carlos Mendoza (Sysmex)', costo: 2500, observaciones: 'Mantenimiento preventivo mensual. Limpieza de cámara de flujo, revisión de filtros y calibración de reactivos. Control de calidad interno aprobado.', sucursal: 'Matriz', evidenciaNombre: 'reporte_preventivo_sysmex_abr2026.pdf', evidenciaUrl: '#' },
  { id: 'HS-109', equipoId: 'EQ-MIC-007', equipoNombre: 'Microscan Autoscan4 (Beckman Coulter)', tipo: 'Preventivo', subtipo: 'Mantenimiento', fecha: '2026-04-08', realizadoPor: 'Tec. Beckman Coulter México', costo: 1950, observaciones: 'Mantenimiento preventivo trimestral. Limpieza óptica del lector, ajuste del sistema de pipeteo y verificación de paneles de identificación bacteriana. Sistema calibrado y operativo.', sucursal: 'Matriz', evidenciaNombre: 'mto_microscan_abr2026.pdf', evidenciaUrl: '#' },
  { id: 'HS-110', equipoId: 'EQ-MIC-004', equipoNombre: 'Microscopio CX31 RBSFA (Olympus) S/N 6D32271', tipo: 'Correctivo', subtipo: 'Correctivo', fecha: '2026-04-15', realizadoPor: 'Tec. Óptica Especializada S.A. de C.V.', costo: 1100, observaciones: 'Corrección por desalineación del revólver porta-objetivos. Limpieza de ópticas con solución de acetona al 30%. Revisión de iluminación Köhler y centrado de condensador. Equipo operativo.', sucursal: 'Matriz', evidenciaNombre: 'recibo_correctivo_microscopio_abr2026.jpg', evidenciaUrl: '#' },
  { id: 'HS-111', equipoId: 'EQ-004', equipoNombre: 'Centrífuga Beckman Coulter', tipo: 'Correctivo', subtipo: 'Correctivo', fecha: '2026-04-12', realizadoPor: 'Tec. Interno Luis Cárdenas', costo: 450, observaciones: 'Cambio de carbones del motor por desgaste. Limpieza del rotor y pruebas de revoluciones (RPM) exitosas.', sucursal: 'Tapachula', evidenciaNombre: 'recibo_refacciones_centrifuga.jpg', evidenciaUrl: '#' },

  // ── Mayo 2026 ─────────────────────────────────────────────────────────────
  { id: 'HS-112', equipoId: 'EQ-MIC-002', equipoNombre: 'Centrífuga Ultra 8T (LW Scientific)', tipo: 'Preventivo', subtipo: 'Mantenimiento', fecha: '2026-05-14', realizadoPor: 'Ing. Rafael Torres (LW Scientific)', costo: 1800, observaciones: 'Mantenimiento preventivo programado. Revisión de escobillas, limpieza del rotor de ángulo fijo, prueba de balanceo y verificación de freno electromagnético.', sucursal: 'Matriz', evidenciaNombre: 'reporte_centrifuga_may2026.pdf', evidenciaUrl: '#' },
  { id: 'HS-113', equipoId: 'INV-DENS-002', equipoNombre: 'Densitómetro 002', tipo: 'Preventivo', subtipo: 'Calibración', fecha: '2026-05-06', realizadoPor: 'Proveedor Externo DensiTech México', costo: 2200, observaciones: 'Calibración externa con estándares trazables a CENAM. Rango 0.00–3.50 Abs validado. Incertidumbre: ±0.005 Abs. Certificado #DT-2026-0502 emitido. Vigencia: 12 meses.', sucursal: 'Matriz', evidenciaNombre: 'certificado_densitometro_002_may2026.pdf', evidenciaUrl: '#' },
  // En proceso — calibración iniciada, pendiente de conclusión
  { id: 'HS-114', equipoId: 'EQ-MIC-012', equipoNombre: 'Enfriador Vertical CV-14', tipo: 'Preventivo', subtipo: 'En Proceso', fecha: '2026-05-20', realizadoPor: 'Ing. Climatización Frigorex (en proceso)', costo: 0, observaciones: 'Calibración de temperatura en proceso. Técnico ingresó el equipo al laboratorio de metrología externo. Pendiente emisión de certificado. Fecha estimada de entrega: 27/05/2026.', sucursal: 'Matriz', evidenciaNombre: null, evidenciaUrl: null }
];

const MESES = [
  { num: 1, label: 'Ene' }, { num: 2, label: 'Feb' }, { num: 3, label: 'Mar' },
  { num: 4, label: 'Abr' }, { num: 5, label: 'May' }, { num: 6, label: 'Jun' },
  { num: 7, label: 'Jul' }, { num: 8, label: 'Ago' }, { num: 9, label: 'Sep' },
  { num: 10, label: 'Oct' }, { num: 11, label: 'Nov' }, { num: 12, label: 'Dic' }
];

const getAreaColor = (area) => {
  const map = {
    'HEMATOLOGÍA':     { bg: 'rgba(239, 68, 68, 0.1)',   text: '#b91c1c' },
    'QUÍMICA CLÍNICA': { bg: 'rgba(37, 99, 235, 0.1)',   text: '#1d4ed8' },
    'UROANÁLISIS':     { bg: 'rgba(245, 158, 11, 0.1)',  text: '#b45309' },
    'MICROBIOLOGÍA':   { bg: 'rgba(16, 185, 129, 0.1)', text: '#047857' }
  };
  return map[area] || { bg: '#f1f5f9', text: '#475569' };
};

export default function ProgramaMantenimiento() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAreaUser = !['admin', 'almacen'].includes(user?.role?.toLowerCase());

  const ROLE_TO_AREA = {
    'hematologia':   'hematología',
    'quimica_clinica': 'química clínica',
    'urianalisis':   'uroanálisis',
    'microbiologia': 'microbiología'
  };
  const userArea = isAreaUser ? (ROLE_TO_AREA[user?.role?.toLowerCase()] || null) : null;


  // Roles de área que siempre pertenecen a Matriz (laboratorio central)
  const ROLES_MATRIZ = ['hematologia', 'microbiologia', 'urianalisis', 'quimica_clinica', 'serologia', 'especiales'];

  // Scoped Branch State
  const [selectedSucursal, setSelectedSucursal] = useState(() => {
    const r = user?.role?.toLowerCase();
    const isAlmacenOrAdmin = r === 'admin' || r === 'almacen';
    if (isAlmacenOrAdmin) return null;
    // Las áreas de laboratorio siempre están en Matriz
    if (ROLES_MATRIZ.includes(r)) return 'Matriz';
    // Usuarios de sucursal usan su rama asignada
    return user?.branch || user?.sucursal || null;
  });

  // Tab control state
  const [activeTab, setActiveTab] = useState('preventivos');

  // Core Database states loaded from Supabase
  const [equipments, setEquipments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Raw file objects for uploading to Supabase Storage
  const [mantoRawFile, setMantoRawFile] = useState(null);
  const [solveRawFile, setSolveRawFile] = useState(null);

  // Fetch all database records from Supabase on mount
  useEffect(() => {
    async function fetchAllData() {
      try {
        setLoading(true);
        
        // 1. Fetch Equipments
        const { data: eqData, error: eqErr } = await supabase
          .from('mantenimiento_equipos')
          .select('*');
        if (eqErr) throw eqErr;
        
        const mappedEquipments = eqData.map(eq => ({
          id: eq.id,
          nombre: eq.nombre,
          marca: eq.marca,
          modelo: eq.modelo,
          serie: eq.serie,
          area: eq.area,
          frecuencia: eq.frecuencia,
          ultimoManto: eq.ultimo_manto,
          proximoManto: eq.proximo_manto,
          sucursal: eq.sucursal,
          estatus: eq.estatus
        }));

        // 2. Fetch Tickets
        const { data: tktData, error: tktErr } = await supabase
          .from('mantenimiento_tickets')
          .select('*');
        if (tktErr) throw tktErr;

        const mappedTickets = tktData.map(tkt => ({
          id: tkt.id,
          equipoId: tkt.equipo_id,
          equipoNombre: tkt.equipo_nombre,
          area: tkt.area,
          reportadoPor: tkt.reportado_por,
          fecha: tkt.fecha,
          falla: tkt.falla,
          urgencia: tkt.urgencia,
          estado: tkt.estado,
          sucursal: tkt.sucursal
        }));

        // 3. Fetch History
        const { data: hsData, error: hsErr } = await supabase
          .from('mantenimiento_historial')
          .select('*');
        if (hsErr) throw hsErr;

        const mappedHistory = hsData.map(hs => ({
          id: hs.id,
          equipoId: hs.equipo_id,
          equipoNombre: hs.equipo_nombre,
          tipo: hs.tipo,
          subtipo: hs.subtipo,
          fecha: hs.fecha,
          realizadoPor: hs.realizado_por,
          costo: parseFloat(hs.costo) || 0,
          observaciones: hs.observaciones,
          sucursal: hs.sucursal,
          evidenciaNombre: hs.evidencia_nombre,
          evidenciaUrl: hs.evidencia_url
        }));

        // Sort history by date descending
        mappedHistory.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        setEquipments(mappedEquipments);
        setTickets(mappedTickets);
        setHistory(mappedHistory);
      } catch (err) {
        console.error('Error fetching data from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, []);

  // Helper to upload evidence file to Supabase Storage
  const uploadEvidenceFile = async (rawFile) => {
    if (!rawFile) return { name: null, url: null };
    
    const fileExt = rawFile.name.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('mantenimiento-evidencia')
      .upload(uniqueFileName, rawFile, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('mantenimiento-evidencia')
      .getPublicUrl(uniqueFileName);
      
    return {
      name: rawFile.name,
      url: publicUrl
    };
  };

  // Modals & UI States
  const [showEquipModal, setShowEquipModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewEntry, setPreviewEntry] = useState(null);
  const [previewEq, setPreviewEq] = useState(null);
  const [isEditingEquip, setIsEditingEquip] = useState(false);
  const [targetEquip, setTargetEquip] = useState(null);

  const [showLogMantoModal, setShowLogMantoModal] = useState(false);
  const [targetMantoItem, setTargetMantoItem] = useState(null);

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showSolveTicketModal, setShowSolveTicketModal] = useState(false);
  const [targetTicket, setTargetTicket] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // Bitácora Anual filters
  const [bitacoraYear, setBitacoraYear] = useState(new Date().getFullYear());
  const [bitacoraAreaFilter, setBitacoraAreaFilter] = useState('Todos');

  // Form states and file uploads
  const [mantoFile, setMantoFile] = useState(null);
  const [solveFile, setSolveFile] = useState(null);

  // Drag states
  const [isDragActiveManto, setIsDragActiveManto] = useState(false);
  const [isDragActiveSolve, setIsDragActiveSolve] = useState(false);

  const handleDrag = (e, type, isActive) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'manto') {
      setIsDragActiveManto(isActive);
    } else {
      setIsDragActiveSolve(isActive);
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'manto') {
      setIsDragActiveManto(false);
    } else {
      setIsDragActiveSolve(false);
    }
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const fileData = {
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.type,
        url: URL.createObjectURL(file)
      };
      if (type === 'manto') {
        setMantoFile(fileData);
        setMantoRawFile(file);
      } else {
        setSolveFile(fileData);
        setSolveRawFile(file);
      }
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const fileData = {
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.type,
        url: URL.createObjectURL(file)
      };
      if (type === 'manto') {
        setMantoFile(fileData);
        setMantoRawFile(file);
      } else {
        setSolveFile(fileData);
        setSolveRawFile(file);
      }
    }
  };

  const [equipForm, setEquipForm] = useState({
    nombre: '', marca: '', modelo: '', serie: '', area: 'HEMATOLOGÍA', frecuencia: 'Mensual', ultimoManto: '', proximoManto: '', sucursal: '', estatus: 'Activo'
  });

  const [mantoForm, setMantoForm] = useState({
    fecha: new Date().toISOString().split('T')[0], realizadoPor: '', costo: '', observaciones: '', subtipo: 'Mantenimiento'
  });

  const [ticketForm, setTicketForm] = useState({
    equipoId: '', reportadoPor: '', falla: '', urgency: 'Media'
  });

  const [solveTicketForm, setSolveTicketForm] = useState({
    fecha: new Date().toISOString().split('T')[0], realizadoPor: '', costo: '', observaciones: ''
  });

  // Today helper
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Helpers to calculate next date based on frequency
  const calculateNextDate = (lastDate, frequency) => {
    if (!lastDate) return '';
    const date = new Date(lastDate + 'T00:00:00');
    if (frequency === 'Mensual') date.setMonth(date.getMonth() + 1);
    else if (frequency === 'Trimestral') date.setMonth(date.getMonth() + 3);
    else if (frequency === 'Semestral') date.setMonth(date.getMonth() + 6);
    else if (frequency === 'Anual') date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  // Helper to determine status
  const getMantoStatus = (proximoManto) => {
    if (!proximoManto) return 'Al día';
    const next = new Date(proximoManto + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    
    if (next < today) return 'Vencido';
    
    // Warning if within 7 days
    const diffTime = next - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) return 'Próximo';
    
    return 'Al día';
  };

  // Calculate high-level operations branch diagnostics for the selection screen
  const branchesDiagnostics = useMemo(() => {
    const diagnostics = {};
    
    SUCURSALES_LIST.forEach(b => {
      const branchEquipments = equipments.filter(e => e.sucursal === b.name && e.estatus === 'Activo');
      const branchTickets = tickets.filter(t => t.sucursal === b.name && t.estado !== 'Resuelto');
      
      let overdue = 0;
      branchEquipments.forEach(eq => {
        if (getMantoStatus(eq.proximoManto) === 'Vencido') overdue++;
      });

      diagnostics[b.name] = {
        totalEquipments: branchEquipments.length,
        overduePreventives: overdue,
        activeTickets: branchTickets.length
      };
    });

    return diagnostics;
  }, [equipments, tickets, todayStr]);

  // Scoped Data filters based on the selected branch!
  const sucursalNorm = selectedSucursal?.toLowerCase().trim() ?? '';

  const scopedEquipments = useMemo(() => {
    let filtered = equipments.filter(e => e.sucursal?.toLowerCase().trim() === sucursalNorm);
    if (userArea) filtered = filtered.filter(e => e.area?.toLowerCase().trim() === userArea);
    return filtered;
  }, [equipments, sucursalNorm, userArea]);

  const scopedTickets = useMemo(() => {
    return tickets.filter(t => t.sucursal?.toLowerCase().trim() === sucursalNorm);
  }, [tickets, sucursalNorm]);

  const scopedHistory = useMemo(() => {
    return history.filter(h => h.sucursal?.toLowerCase().trim() === sucursalNorm);
  }, [history, sucursalNorm]);

  // Dynamic calculations / KPIs for the Scoped Branch
  const kpis = useMemo(() => {
    const activeEquip = scopedEquipments.filter(e => e.estatus === 'Activo');
    const total = activeEquip.length;
    
    let alDia = 0;
    let proximo = 0;
    let vencido = 0;
    
    activeEquip.forEach(e => {
      const status = getMantoStatus(e.proximoManto);
      if (status === 'Vencido') vencido++;
      else if (status === 'Próximo') proximo++;
      else alDia++;
    });

    const activeTickets = scopedTickets.filter(t => t.estado !== 'Resuelto').length;

    return { total, alDia, proximo, vencido, activeTickets };
  }, [scopedEquipments, scopedTickets, todayStr]);

  // Preventive List Scoped
  const preventivosList = useMemo(() => {
    return scopedEquipments
      .filter(e => e.estatus === 'Activo')
      .map(e => ({
        ...e,
        estadoManto: getMantoStatus(e.proximoManto)
      }))
      .sort((a, b) => new Date(a.proximoManto) - new Date(b.proximoManto));
  }, [scopedEquipments, todayStr]);

  // Equipment Form CRUD Handlers
  const handleOpenEquipModal = (equip = null) => {
    if (equip) {
      setIsEditingEquip(true);
      setTargetEquip(equip);
      setEquipForm({ ...equip });
    } else {
      setIsEditingEquip(false);
      setTargetEquip(null);
      setEquipForm({
        nombre: '',
        marca: '',
        modelo: '',
        serie: '',
        area: 'HEMATOLOGÍA',
        frecuencia: 'Mensual',
        ultimoManto: '',
        proximoManto: '',
        sucursal: selectedSucursal,
        estatus: 'Activo'
      });
    }
    setShowEquipModal(true);
  };

  const handleSubmitEquip = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isEditingEquip && targetEquip) {
        const { error } = await supabase
          .from('mantenimiento_equipos')
          .update({
            nombre: equipForm.nombre,
            marca: equipForm.marca,
            modelo: equipForm.modelo,
            serie: equipForm.serie,
            area: equipForm.area,
            frecuencia: equipForm.frecuencia,
            ultimo_manto: equipForm.ultimoManto || null,
            proximo_manto: equipForm.proximoManto || null,
            sucursal: equipForm.sucursal,
            estatus: equipForm.estatus
          })
          .eq('id', targetEquip.id);

        if (error) throw error;

        setEquipments(prev => prev.map(item => item.id === targetEquip.id ? { ...equipForm } : item));
      } else {
        const prefix = 'EQ-';
        let maxNum = 0;
        equipments.forEach(eq => {
          if (eq.id && eq.id.startsWith(prefix)) {
            const num = parseInt(eq.id.replace(prefix, ''), 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        });
        const newId = `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;
        const newEquip = { ...equipForm, id: newId };

        const { error } = await supabase
          .from('mantenimiento_equipos')
          .insert([{
            id: newId,
            nombre: newEquip.nombre,
            marca: newEquip.marca,
            modelo: newEquip.modelo,
            serie: newEquip.serie,
            area: newEquip.area,
            frecuencia: newEquip.frecuencia,
            ultimo_manto: newEquip.ultimoManto || null,
            proximo_manto: newEquip.proximoManto || null,
            sucursal: newEquip.sucursal,
            estatus: newEquip.estatus
          }]);

        if (error) throw error;

        setEquipments(prev => [...prev, newEquip]);
      }
      setShowEquipModal(false);
    } catch (err) {
      console.error('Error saving equipment:', err);
      alert('Error al guardar el equipo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInactivateEquip = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de inactivar el equipo "${nombre}"?`)) {
      try {
        setSaving(true);
        const { error } = await supabase
          .from('mantenimiento_equipos')
          .update({ estatus: 'Inactivo' })
          .eq('id', id);

        if (error) throw error;

        setEquipments(prev => prev.map(item => item.id === id ? { ...item, estatus: 'Inactivo' } : item));
      } catch (err) {
        console.error('Error inactivating equipment:', err);
        alert('Error al inactivar el equipo: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleReactivateEquip = async (id, nombre) => {
    if (window.confirm(`¿Reactivar el equipo "${nombre}"?`)) {
      try {
        setSaving(true);
        const { error } = await supabase
          .from('mantenimiento_equipos')
          .update({ estatus: 'Activo' })
          .eq('id', id);

        if (error) throw error;

        setEquipments(prev => prev.map(item => item.id === id ? { ...item, estatus: 'Activo' } : item));
      } catch (err) {
        console.error('Error reactivating equipment:', err);
        alert('Error al reactivar el equipo: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  // Log Preventive Mantenimiento Service Handler
  const handleOpenLogMantoModal = (equip) => {
    setTargetMantoItem(equip);
    setMantoFile(null);
    setMantoRawFile(null);
    setMantoForm({
      fecha: todayStr,
      realizadoPor: '',
      costo: '',
      subtipo: 'Mantenimiento',
      observaciones: `Mantenimiento preventivo ${equip.frecuencia.toLowerCase()}. Limpieza general, calibración del equipo y verificación de parámetros de control.`
    });
    setShowLogMantoModal(true);
  };

  const handleSubmitMantoLog = async (e) => {
    e.preventDefault();
    if (!targetMantoItem) return;

    try {
      setSaving(true);

      // Upload file if present
      let evidence = { name: null, url: null };
      if (mantoRawFile) {
        evidence = await uploadEvidenceFile(mantoRawFile);
      }

      // Generate robust ID for history
      const prefix = 'HS-';
      let maxNum = 0;
      history.forEach(h => {
        if (h.id && h.id.startsWith(prefix)) {
          const num = parseInt(h.id.replace(prefix, ''), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      const newLogId = `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;

      const nextDate = calculateNextDate(mantoForm.fecha, targetMantoItem.frecuencia);

      // 1. Insert history entry
      const { error: histError } = await supabase
        .from('mantenimiento_historial')
        .insert([{
          id: newLogId,
          equipo_id: targetMantoItem.id,
          equipo_nombre: targetMantoItem.nombre,
          tipo: 'Preventivo',
          subtipo: mantoForm.subtipo || 'Verificación',
          fecha: mantoForm.fecha,
          realizado_por: mantoForm.realizadoPor || 'Técnico Interno',
          costo: parseFloat(mantoForm.costo) || 0,
          observaciones: mantoForm.observaciones,
          sucursal: selectedSucursal,
          evidencia_nombre: evidence.name,
          evidencia_url: evidence.url
        }]);

      if (histError) throw histError;

      // 2. Update equipment dates
      const { error: eqError } = await supabase
        .from('mantenimiento_equipos')
        .update({
          ultimo_manto: mantoForm.fecha,
          proximo_manto: nextDate
        })
        .eq('id', targetMantoItem.id);

      if (eqError) throw eqError;

      // 3. Update React states
      const newLog = {
        id: newLogId,
        equipoId: targetMantoItem.id,
        equipoNombre: targetMantoItem.nombre,
        tipo: 'Preventivo',
        subtipo: mantoForm.subtipo || 'Verificación',
        fecha: mantoForm.fecha,
        realizadoPor: mantoForm.realizadoPor || 'Técnico Interno',
        costo: parseFloat(mantoForm.costo) || 0,
        observaciones: mantoForm.observaciones,
        sucursal: selectedSucursal,
        evidenciaNombre: evidence.name,
        evidenciaUrl: evidence.url
      };

      setEquipments(prev => prev.map(eq => eq.id === targetMantoItem.id ? {
        ...eq,
        ultimoManto: mantoForm.fecha,
        proximoManto: nextDate
      } : eq));

      setHistory(prev => [newLog, ...prev]);
      setShowLogMantoModal(false);
      
      setMantoFile(null);
      setMantoRawFile(null);
    } catch (err) {
      console.error('Error recording maintenance service:', err);
      alert('Error al registrar el mantenimiento: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Corrective Ticket handlers
  const handleOpenTicketModal = () => {
    // Filter equipments of THIS branch
    const branchEquips = scopedEquipments.filter(eq => eq.estatus === 'Activo');
    setTicketForm({
      equipoId: branchEquips.length > 0 ? branchEquips[0].id : '',
      reportadoPor: user?.name || '',
      falla: '',
      urgency: 'Media'
    });
    setShowTicketModal(true);
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    const targetEqObj = scopedEquipments.find(eq => eq.id === ticketForm.equipoId);
    if (!targetEqObj) return;

    try {
      setSaving(true);

      const prefix = 'TKT-';
      let maxNum = 0;
      tickets.forEach(t => {
        if (t.id && t.id.startsWith(prefix)) {
          const num = parseInt(t.id.replace(prefix, ''), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      const newTicketId = `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;

      const newTicket = {
        id: newTicketId,
        equipoId: targetEqObj.id,
        equipoNombre: targetEqObj.nombre,
        area: targetEqObj.area,
        reportadoPor: ticketForm.reportadoPor,
        fecha: todayStr,
        falla: ticketForm.falla,
        urgencia: ticketForm.urgency,
        estado: 'Pendiente',
        sucursal: selectedSucursal
      };

      const { error } = await supabase
        .from('mantenimiento_tickets')
        .insert([{
          id: newTicketId,
          equipo_id: targetEqObj.id,
          equipo_nombre: targetEqObj.nombre,
          area: targetEqObj.area,
          reportado_por: ticketForm.reportadoPor,
          fecha: todayStr,
          falla: ticketForm.falla,
          urgencia: ticketForm.urgency,
          estado: 'Pendiente',
          sucursal: selectedSucursal
        }]);

      if (error) throw error;

      setTickets(prev => [newTicket, ...prev]);
      setShowTicketModal(false);
    } catch (err) {
      console.error('Error reporting failure:', err);
      alert('Error al reportar la falla: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('mantenimiento_tickets')
        .update({ estado: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, estado: newStatus } : t));
    } catch (err) {
      console.error('Error updating ticket status:', err);
      alert('Error al cambiar el estado del ticket: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSolveTicketModal = (ticket) => {
    setTargetTicket(ticket);
    setSolveFile(null);
    setSolveRawFile(null);
    setSolveTicketForm({
      fecha: todayStr,
      realizadoPor: '',
      costo: '',
      observaciones: `Servicio técnico correctivo para resolver: "${ticket.falla}". Se realizó diagnóstico y reparación del fallo.`
    });
    setShowSolveTicketModal(true);
  };

  const handleSubmitSolveTicket = async (e) => {
    e.preventDefault();
    if (!targetTicket) return;

    try {
      setSaving(true);

      // Upload file if present
      let evidence = { name: null, url: null };
      if (solveRawFile) {
        evidence = await uploadEvidenceFile(solveRawFile);
      }

      // Generate robust ID for history
      const prefix = 'HS-';
      let maxNum = 0;
      history.forEach(h => {
        if (h.id && h.id.startsWith(prefix)) {
          const num = parseInt(h.id.replace(prefix, ''), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      const newLogId = `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;

      const fullObservaciones = `${solveTicketForm.observaciones} | Reporte original de falla: ${targetTicket.falla} (Firma de reportante: ${targetTicket.reportadoPor}).`;

      // 1. Insert history entry
      const { error: histError } = await supabase
        .from('mantenimiento_historial')
        .insert([{
          id: newLogId,
          equipo_id: targetTicket.equipoId,
          equipo_nombre: targetTicket.equipoNombre,
          tipo: 'Correctivo',
          subtipo: 'Correctivo',
          fecha: solveTicketForm.fecha,
          realizado_por: solveTicketForm.realizadoPor || 'Técnico Especialista',
          costo: parseFloat(solveTicketForm.costo) || 0,
          observaciones: fullObservaciones,
          sucursal: selectedSucursal,
          evidencia_nombre: evidence.name,
          evidencia_url: evidence.url
        }]);

      if (histError) throw histError;

      // 2. Update ticket state to Resuelto
      const { error: tktError } = await supabase
        .from('mantenimiento_tickets')
        .update({ estado: 'Resuelto' })
        .eq('id', targetTicket.id);

      if (tktError) throw tktError;

      // 3. Update React states
      const newLog = {
        id: newLogId,
        equipoId: targetTicket.equipoId,
        equipoNombre: targetTicket.equipoNombre,
        tipo: 'Correctivo',
        subtipo: 'Correctivo',
        fecha: solveTicketForm.fecha,
        realizadoPor: solveTicketForm.realizadoPor || 'Técnico Especialista',
        costo: parseFloat(solveTicketForm.costo) || 0,
        observaciones: fullObservaciones,
        sucursal: selectedSucursal,
        evidenciaNombre: evidence.name,
        evidenciaUrl: evidence.url
      };

      setTickets(prev => prev.map(t => t.id === targetTicket.id ? { ...t, estado: 'Resuelto' } : t));
      setHistory(prev => [newLog, ...prev]);
      setShowSolveTicketModal(false);

      setSolveFile(null);
      setSolveRawFile(null);
    } catch (err) {
      console.error('Error solving corrective ticket:', err);
      alert('Error al resolver el ticket: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter lists based on inputs
  const filteredEquipments = useMemo(() => {
    return scopedEquipments.filter(e => {
      const matchesSearch = e.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           e.serie.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           e.marca.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesArea = areaFilter === 'Todos' || e.area === areaFilter;
      const matchesStatus = statusFilter === 'Todos' || e.estatus === statusFilter;

      return matchesSearch && matchesArea && matchesStatus;
    });
  }, [scopedEquipments, searchQuery, areaFilter, statusFilter]);

  const filteredHistory = useMemo(() => {
    return scopedHistory.filter(h => {
      const matchesSearch = h.equipoNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           h.observaciones.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           h.realizadoPor.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [scopedHistory, searchQuery]);

  const filteredTickets = useMemo(() => {
    return scopedTickets.filter(t => {
      const matchesSearch = t.equipoNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.falla.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesArea = areaFilter === 'Todos' || t.area === areaFilter;
      const matchesStatus = statusFilter === 'Todos' || t.estado === statusFilter;

      return matchesSearch && matchesArea && matchesStatus;
    });
  }, [scopedTickets, searchQuery, areaFilter, statusFilter]);

  // Sum total spent on history
  const totalSpent = useMemo(() => {
    return filteredHistory.reduce((sum, h) => sum + h.costo, 0);
  }, [filteredHistory]);

  // Bitácora Anual: equipos filtrados por área
  const bitacoraEquipments = useMemo(() => {
    return scopedEquipments
      .filter(e => e.estatus === 'Activo' && (bitacoraAreaFilter === 'Todos' || e.area === bitacoraAreaFilter))
      .sort((a, b) => a.area.localeCompare(b.area) || a.nombre.localeCompare(b.nombre));
  }, [scopedEquipments, bitacoraAreaFilter]);

  // Bitácora Anual: matriz equipoId → mes → { calver, mtto, mttoFecha, observaciones }
  const bitacoraData = useMemo(() => {
    const data = {};
    scopedHistory
      .filter(h => new Date(h.fecha + 'T00:00:00').getFullYear() === bitacoraYear)
      .forEach(h => {
        const month = new Date(h.fecha + 'T00:00:00').getMonth() + 1;
        if (!data[h.equipoId]) data[h.equipoId] = {};
        if (!data[h.equipoId][month]) data[h.equipoId][month] = { calver: null, mtto: false, mttoFecha: null, mttoSubtipo: null, observaciones: [], entries: [] };
        if (h.subtipo === 'Calibración' || h.subtipo === 'Verificación' || h.subtipo === 'En Proceso') {
          data[h.equipoId][month].calver = h.subtipo;
        } else {
          // 'Mantenimiento', 'Preventivo', 'Correctivo' o legacy
          data[h.equipoId][month].mtto = true;
          data[h.equipoId][month].mttoSubtipo = h.subtipo || 'Mantenimiento';
          data[h.equipoId][month].mttoFecha = h.fecha;
        }
        if (h.observaciones) data[h.equipoId][month].observaciones.push(h.observaciones.substring(0, 100));
        data[h.equipoId][month].entries.push(h);
      });
    return data;
  }, [scopedHistory, bitacoraYear]);

  // Meses esperados por equipo en el año seleccionado (para semaforización)
  const expectedMaintenanceMonths = useMemo(() => {
    const intervalMap = { 'Mensual': 1, 'Trimestral': 3, 'Semestral': 6, 'Anual': 12 };
    const result = {};
    bitacoraEquipments.forEach(eq => {
      if (!eq.ultimoManto) { result[eq.id] = new Set(); return; }
      const interval = intervalMap[eq.frecuencia] || 12;
      const months = new Set();
      let d = new Date(eq.ultimoManto + 'T00:00:00');
      while (d.getFullYear() >= bitacoraYear) {
        const nd = new Date(d); nd.setMonth(nd.getMonth() - interval); d = nd;
      }
      const nd = new Date(d); nd.setMonth(nd.getMonth() + interval); d = nd;
      while (d.getFullYear() <= bitacoraYear) {
        if (d.getFullYear() === bitacoraYear) months.add(d.getMonth() + 1);
        const nd2 = new Date(d); nd2.setMonth(nd2.getMonth() + interval); d = nd2;
      }
      result[eq.id] = months;
    });
    return result;
  }, [bitacoraEquipments, bitacoraYear]);

  // Handler: abrir modal de previsualización de comprobante
  const handleOpenPreview = (entry, eq) => {
    setPreviewEntry(entry);
    setPreviewEq(eq);
    setShowPreviewModal(true);
  };

  // Export Mock to Excel (Simulated)
  const handleExportSimulated = () => {
    alert(`Simulación de Exportación:\nSe ha generado un archivo Excel con la bitácora técnica de mantenimientos de la Sucursal ${selectedSucursal}. El archivo se descargará en tu navegador.`);
  };

  if (loading) {
    return (
      <div className={styles.container} style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', gap: '1.5rem'}}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid rgba(37, 99, 235, 0.1)',
          borderTop: '5px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{color: '#64748b', fontWeight: '600', fontSize: '1.1rem'}}>Cargando bitácora y catálogo técnico...</p>
      </div>
    );
  }

  // ==================== RENDER 1: BRANCH SELECTOR ====================
  if (!selectedSucursal) {
    // Usuarios de área no pueden seleccionar sucursal
    if (isAreaUser) {
      return (
        <div className={styles.container} style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',minHeight:'60vh',gap:'1rem'}}>
          <span className="material-symbols-rounded" style={{fontSize:'4rem',color:'#f59e0b'}}>warning</span>
          <h3 style={{color:'#1e293b',margin:0}}>Sin sucursal asignada</h3>
          <p style={{color:'#64748b',margin:0,textAlign:'center',maxWidth:'360px'}}>
            Tu usuario no tiene una sucursal configurada. Contacta al administrador para que la asigne en tu perfil.
          </p>
        </div>
      );
    }
    return (
      <div className={styles.container}>
        <div className={styles.branchSelectorContainer}>
          <div className={styles.branchSelectorTitle}>
            <h2>Programa de Mantenimiento</h2>
            <p>Selecciona una sucursal para gestionar de manera individual sus equipos y bitácoras técnicas</p>
          </div>
          
          <div className={styles.branchGrid}>
            {SUCURSALES_LIST.map(b => {
              const diag = branchesDiagnostics[b.name] || { totalEquipments: 0, overduePreventives: 0, activeTickets: 0 };
              const hasAlerts = diag.overduePreventives > 0 || diag.activeTickets > 0;
              
              return (
                <div key={b.id} className={styles.branchCard} onClick={() => setSelectedSucursal(b.name)}>
                  <div className={styles.branchCardHeader}>
                    <div className={styles.branchCardIcon}>
                      <span className="material-symbols-rounded">store</span>
                    </div>
                    <div className={styles.branchCardTitle}>
                      {b.name}
                      <p>{b.desc}</p>
                    </div>
                  </div>

                  <div className={styles.branchCardStats}>
                    <div className={styles.branchCardStatsItem}>
                      <span className={styles.branchCardStatsValue}>{diag.totalEquipments}</span>
                      <span className={styles.branchCardStatsLabel}>Equipos</span>
                    </div>
                    <div className={styles.branchCardStatsItem}>
                      <span className={styles.branchCardStatsValue} style={{color: diag.activeTickets > 0 ? '#ef4444' : '#1e293b'}}>
                        {diag.activeTickets}
                      </span>
                      <span className={styles.branchCardStatsLabel}>Fallas</span>
                    </div>
                    <div className={styles.branchCardStatsItem} style={{gridColumn: '1 / -1', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span className={styles.branchCardStatsLabel}>Vencidos</span>
                      <span className={styles.badge} style={{
                        background: diag.overduePreventives > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: diag.overduePreventives > 0 ? '#ef4444' : '#10b981',
                        padding: '0.1rem 0.4rem',
                        fontSize: '0.7rem'
                      }}>
                        {diag.overduePreventives} preventivos
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER 2: MAIN SCOPED CONTENT ====================
  return (
    <div className={styles.container}>
      {!isAreaUser && (
        <button className={styles.mobileBackBtn} onClick={() => setSelectedSucursal(null)}>
          <span className="material-symbols-rounded">arrow_back</span> Cambiar Sucursal
        </button>
      )}

      {/* Header section with selected branch badge and action to change */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleIcon}>
            <span className="material-symbols-rounded">build</span>
          </div>
          <div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap'}}>
              <h1>Programa de Mantenimiento</h1>
              <span className={styles.activeBranchBadge}>
                <span className="material-symbols-rounded" style={{fontSize: '18px'}}>location_on</span>
                Sucursal: {selectedSucursal}
              </span>
              {!isAreaUser && (
                <button className={styles.changeBranchBtn} onClick={() => setSelectedSucursal(null)} title="Cambiar de Sucursal">
                  <span className="material-symbols-rounded" style={{fontSize: '16px'}}>swap_horiz</span> Cambiar
                </button>
              )}
            </div>
            <p>Control de equipos, calibraciones preventivas y reparaciones de {selectedSucursal}</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          {activeTab === 'equipos' && !isAreaUser && (
            <button className={styles.primaryBtn} onClick={() => handleOpenEquipModal()}>
              <span className="material-symbols-rounded">add</span> Registrar Nuevo Equipo
            </button>
          )}
          {activeTab === 'correctivos' && (
            <button className={styles.primaryBtn} style={{background: '#ef4444'}} onClick={handleOpenTicketModal} disabled={!isAreaUser && scopedEquipments.length === 0}>
              <span className="material-symbols-rounded">report_problem</span> Reportar Falla Técnica
            </button>
          )}
          {activeTab === 'historial' && (
            <button className={styles.secondaryBtn} onClick={handleExportSimulated}>
              <span className="material-symbols-rounded">download_for_offline</span> Exportar Bitácora
            </button>
          )}
        </div>
      </header>

      {/* KPI dashboard for visual highlights */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiCardInfo}`} onClick={() => setActiveTab('equipos')}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconBlue}`}>
            <span className="material-symbols-rounded">devices</span>
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiValue}>{kpis.total}</span>
            <span className={styles.kpiLabel}>Equipos en Sede</span>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiCardSuccess}`} onClick={() => setActiveTab('preventivos')}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconGreen}`}>
            <span className="material-symbols-rounded">check_circle</span>
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiValue}>{kpis.alDia}</span>
            <span className={styles.kpiLabel}>Al Corriente</span>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiCardWarning}`} onClick={() => setActiveTab('preventivos')}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconYellow}`}>
            <span className="material-symbols-rounded">schedule</span>
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiValue}>{kpis.proximo}</span>
            <span className={styles.kpiLabel}>Por Vencer (≤ 7 días)</span>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiCardDanger}`} onClick={() => setActiveTab('preventivos')}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconRed}`}>
            <span className="material-symbols-rounded">report</span>
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiValue}>{kpis.vencido}</span>
            <span className={styles.kpiLabel}>Prev. Vencidos</span>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiCardDanger}`} onClick={() => setActiveTab('correctivos')}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconRed}`}>
            <span className="material-symbols-rounded">engineering</span>
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiValue}>{kpis.activeTickets}</span>
            <span className={styles.kpiLabel}>Fallas Activas</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation list */}
      <nav className={styles.tabsContainer}>
        <button className={`${styles.tabBtn} ${activeTab === 'preventivos' ? styles.tabBtnActive : ''}`} onClick={() => { setActiveTab('preventivos'); setSearchQuery(''); }}>
          <span className="material-symbols-rounded">calendar_month</span> Calendario Preventivo
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'equipos' ? styles.tabBtnActive : ''}`} onClick={() => { setActiveTab('equipos'); setSearchQuery(''); }}>
          <span className="material-symbols-rounded">devices</span> Catálogo de Equipos
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'correctivos' ? styles.tabBtnActive : ''}`} onClick={() => { setActiveTab('correctivos'); setSearchQuery(''); }}>
          <span className="material-symbols-rounded">warning</span> Tickets Correctivos
        </button>
        {!isAreaUser && (
          <button className={`${styles.tabBtn} ${activeTab === 'historial' ? styles.tabBtnActive : ''}`} onClick={() => { setActiveTab('historial'); setSearchQuery(''); }}>
            <span className="material-symbols-rounded">event_note</span> Bitácora Anual
          </button>
        )}
      </nav>
      {isAreaUser && (
        <div style={{background:'rgba(37,99,235,0.06)', border:'1px solid #bfdbfe', borderRadius:'12px', padding:'0.75rem 1rem', marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:'0.6rem', fontSize:'0.875rem', color:'#1d4ed8'}}>
          <span className="material-symbols-rounded" style={{fontSize:'1.2rem'}}>info</span>
          Puedes ver los equipos de tu área y reportar fallas técnicas. El equipo de mantenimiento atenderá tu reporte.
        </div>
      )}

      {/* Filters Area */}
      <div className={styles.filterRow}>
        <div className={styles.searchWrapper}>
          <span className="material-symbols-rounded">search</span>
          <input 
            type="text" 
            placeholder={
              activeTab === 'preventivos' ? 'Buscar equipo por nombre...' : 
              activeTab === 'equipos' ? 'Buscar por ID, nombre, serie...' : 
              activeTab === 'correctivos' ? 'Buscar falla reportada...' : 'Buscar en observaciones u operarios...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {(activeTab === 'equipos' || activeTab === 'correctivos') && (
          <div className={styles.filtersWrapper}>
            <select className={styles.filterSelect} value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
              <option value="Todos">Todas las Áreas</option>
              <option value="HEMATOLOGÍA">Hematología</option>
              <option value="QUÍMICA CLÍNICA">Química Clínica</option>
              <option value="UROANÁLISIS">Uroanálisis</option>
              <option value="MICROBIOLOGÍA">Microbiología</option>
            </select>

            {activeTab === 'equipos' ? (
              <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="Todos">Todos los Estados</option>
                <option value="Activo">Activos</option>
                <option value="Inactivo">Inactivos</option>
              </select>
            ) : (
              <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="Todos">Todos los Tickets</option>
                <option value="Pendiente">Pendientes</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Resuelto">Resueltos</option>
              </select>
            )}
          </div>
        )}


      </div>

      {/* Empty State warning for branches with no items */}
      {scopedEquipments.length === 0 && activeTab !== 'historial' && (
        <div style={{textAlign: 'center', padding: '4rem 2rem', background: '#ffffff', borderRadius: '20px', border: '1px dashed #cbd5e1', color: '#64748b', marginBottom: '2rem'}}>
          <span className="material-symbols-rounded" style={{fontSize: '4rem', color: '#94a3b8', marginBottom: '1rem'}}>devices_other</span>
          <h3 style={{fontSize: '1.25rem', color: '#1e293b', margin: '0 0 0.5rem 0', fontWeight: '700'}}>Sin Equipos Registrados</h3>
          {isAreaUser ? (
            <>
              <p style={{margin: '0 0 1.5rem 0', fontSize: '0.95rem'}}>No se encontraron equipos para tu área en esta sucursal. Puedes reportar una falla de todas formas.</p>
              <button className={styles.primaryBtn} style={{background: '#ef4444'}} onClick={handleOpenTicketModal}>
                <span className="material-symbols-rounded">report_problem</span> Reportar Falla Técnica
              </button>
            </>
          ) : (
            <>
              <p style={{margin: '0 0 1.5rem 0', fontSize: '0.95rem'}}>Esta sucursal aún no cuenta con equipos asignados en su programa de mantenimiento.</p>
              <button className={styles.primaryBtn} onClick={() => handleOpenEquipModal()}>
                <span className="material-symbols-rounded">add</span> Agregar Primer Equipo
              </button>
            </>
          )}
        </div>
      )}

      {/* -------------------- 1. TAB: CALENDARIO PREVENTIVO -------------------- */}
      {activeTab === 'preventivos' && scopedEquipments.length > 0 && (
        <>
          <div className={`${styles.tableWrapper} ${styles.desktopView}`}>
            <table className={styles.denseTable}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Analizador / Equipo</th>
                  <th>Área Técnica</th>
                  <th>Frecuencia</th>
                  <th>Último Manto.</th>
                  <th>Próximo Manto.</th>
                  <th className={styles.textCenter}>Estado</th>
                  {!isAreaUser && <th className={styles.textCenter}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {preventivosList
                  .filter(e => e.nombre.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(item => (
                    <tr key={item.id}>
                      <td style={{fontWeight: '700', color: '#64748b'}}>{item.id}</td>
                      <td>
                        <div className={styles.equipmentCell}>
                          <span className={styles.equipmentName}>{item.nombre}</span>
                          <span className={styles.equipmentSub}>Marca: {item.marca} • Modelo: {item.modelo}</span>
                        </div>
                      </td>
                      <td><span className={styles.techAreaTag}>{item.area}</span></td>
                      <td>{item.frecuencia}</td>
                      <td>{item.ultimoManto || 'Sin registrar'}</td>
                      <td style={{fontWeight: '600'}}>{item.proximoManto}</td>
                      <td className={styles.textCenter}>
                        {item.estadoManto === 'Al día' && <span className={`${styles.badge} ${styles.badgeSuccess}`}>Al corriente</span>}
                        {item.estadoManto === 'Próximo' && <span className={`${styles.badge} ${styles.badgeWarning}`}>Próximo</span>}
                        {item.estadoManto === 'Vencido' && <span className={`${styles.badge} ${styles.badgeDanger}`}>Vencido</span>}
                      </td>
                      {!isAreaUser && (
                        <td className={styles.textCenter}>
                          <button className={`${styles.primaryBtn}`} style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}} onClick={() => handleOpenLogMantoModal(item)}>
                            <span className="material-symbols-rounded" style={{fontSize: '1rem'}}>edit_calendar</span> Registrar Manto.
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileCards}>
            {preventivosList
              .filter(e => e.nombre.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(item => (
                <div key={item.id} className={styles.mobileCard}>
                  <div className={styles.mobileCardHeader}>
                    <div className={styles.mobileCardTitle}>{item.nombre}</div>
                    <div>
                      {item.estadoManto === 'Al día' && <span className={`${styles.badge} ${styles.badgeSuccess}`}>Al corriente</span>}
                      {item.estadoManto === 'Próximo' && <span className={`${styles.badge} ${styles.badgeWarning}`}>Próximo</span>}
                      {item.estadoManto === 'Vencido' && <span className={`${styles.badge} ${styles.badgeDanger}`}>Vencido</span>}
                    </div>
                  </div>
                  <div className={styles.mobileCardMeta}>
                    <div><strong>Área:</strong> {item.area}</div>
                    <div><strong>Frecuencia:</strong> {item.frecuencia}</div>
                    <div><strong>Último:</strong> {item.ultimoManto || '---'}</div>
                    <div><strong>Próximo:</strong> <span style={{fontWeight: '700'}}>{item.proximoManto}</span></div>
                  </div>
                  {!isAreaUser && (
                    <div className={styles.mobileCardActions}>
                      <button className={styles.primaryBtn} style={{width: '100%', justifyContent: 'center'}} onClick={() => handleOpenLogMantoModal(item)}>
                        <span className="material-symbols-rounded">edit_calendar</span> Registrar Mantenimiento
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </>
      )}

      {/* -------------------- 2. TAB: CATALOGO DE EQUIPOS -------------------- */}
      {activeTab === 'equipos' && scopedEquipments.length > 0 && (
        <>
          <div className={`${styles.tableWrapper} ${styles.desktopView}`}>
            <table className={styles.denseTable}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Analizador / Equipo</th>
                  <th>N° de Serie</th>
                  <th>Área Técnica</th>
                  <th>Frecuencia</th>
                  <th>Último Manto.</th>
                  <th>Próximo Manto.</th>
                  <th className={styles.textCenter}>Estatus</th>
                  {!isAreaUser && <th className={styles.textCenter}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEquipments.map(item => (
                  <tr key={item.id} style={{opacity: item.estatus === 'Inactivo' ? 0.6 : 1}}>
                    <td style={{fontWeight: '700', color: '#64748b'}}>{item.id}</td>
                    <td>
                      <div className={styles.equipmentCell}>
                        <span className={styles.equipmentName}>{item.nombre}</span>
                        <span className={styles.equipmentSub}>{item.marca} • Mod: {item.modelo}</span>
                      </div>
                    </td>
                    <td style={{fontFamily: 'monospace', fontWeight: '600'}}>{item.serie}</td>
                    <td><span className={styles.techAreaTag}>{item.area}</span></td>
                    <td>{item.frecuencia}</td>
                    <td>{item.ultimoManto || '---'}</td>
                    <td>{item.proximoManto || '---'}</td>
                    <td className={styles.textCenter}>
                      {item.estatus === 'Activo' ? (
                        <span className={`${styles.badge} ${styles.badgeSuccess}`}>Activo</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeDanger}`} style={{background: '#f1f5f9', color: '#94a3b8'}}>Inactivo</span>
                      )}
                    </td>
                    {!isAreaUser && (
                      <td className={styles.textCenter}>
                        <div style={{display: 'flex', gap: '0.4rem', justifyContent: 'center'}}>
                          <button className={styles.actionBtn} title="Editar Equipo" onClick={() => handleOpenEquipModal(item)}>
                            <span className="material-symbols-rounded">edit</span>
                          </button>
                          {item.estatus === 'Activo' ? (
                            <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} title="Inactivar Equipo" onClick={() => handleInactivateEquip(item.id, item.nombre)}>
                              <span className="material-symbols-rounded">block</span>
                            </button>
                          ) : (
                            <button className={`${styles.actionBtn} ${styles.actionBtnSuccess}`} title="Reactivar Equipo" onClick={() => handleReactivateEquip(item.id, item.nombre)}>
                              <span className="material-symbols-rounded">settings_backup_restore</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileCards}>
            {filteredEquipments.map(item => (
              <div key={item.id} className={styles.mobileCard} style={{opacity: item.estatus === 'Inactivo' ? 0.6 : 1}}>
                <div className={styles.mobileCardHeader}>
                  <div className={styles.mobileCardTitle}>{item.nombre}</div>
                  <div>
                    {item.estatus === 'Activo' ? (
                      <span className={`${styles.badge} ${styles.badgeSuccess}`}>Activo</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeDanger}`} style={{background: '#f1f5f9', color: '#94a3b8'}}>Inactivo</span>
                    )}
                  </div>
                </div>
                <div className={styles.mobileCardMeta}>
                  <div><strong>ID:</strong> {item.id}</div>
                  <div><strong>Serie:</strong> {item.serie}</div>
                  <div><strong>Área:</strong> {item.area}</div>
                  <div><strong>Frecuencia:</strong> {item.frecuencia}</div>
                  <div><strong>Último:</strong> {item.ultimoManto || '---'}</div>
                  <div><strong>Próximo:</strong> {item.proximoManto || '---'}</div>
                </div>
                {!isAreaUser && (
                  <div className={styles.mobileCardActions}>
                    <button className={styles.actionBtn} style={{flex: 1, padding: '0.5rem'}} onClick={() => handleOpenEquipModal(item)}>
                      <span className="material-symbols-rounded">edit</span> Editar
                    </button>
                    {item.estatus === 'Activo' ? (
                      <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} style={{flex: 1, padding: '0.5rem'}} onClick={() => handleInactivateEquip(item.id, item.nombre)}>
                        <span className="material-symbols-rounded">block</span> Inactivar
                      </button>
                    ) : (
                      <button className={`${styles.actionBtn} ${styles.actionBtnSuccess}`} style={{flex: 1, padding: '0.5rem'}} onClick={() => handleReactivateEquip(item.id, item.nombre)}>
                        <span className="material-symbols-rounded">settings_backup_restore</span> Reactivar
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* -------------------- 3. TAB: TICKETS CORRECTIVOS -------------------- */}
      {activeTab === 'correctivos' && scopedEquipments.length > 0 && (
        <div className={styles.ticketGrid}>
          {filteredTickets.map(ticket => (
            <div key={ticket.id} className={styles.ticketCard} style={{borderTop: ticket.urgencia === 'Alta' ? '4px solid #ef4444' : ticket.urgencia === 'Media' ? '4px solid #f59e0b' : '4px solid #2563eb'}}>
              <div className={styles.ticketCardHeader}>
                <span className={styles.techAreaTag}>{ticket.area}</span>
                <span className={`${styles.ticketUrgencyBadge} ${ticket.urgencia === 'Alta' ? styles.urgencyHigh : ticket.urgencia === 'Media' ? styles.urgencyMedium : styles.urgencyLow}`}>
                  Urgencia {ticket.urgencia}
                </span>
              </div>
              <div className={styles.ticketBody}>
                <span style={{fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8'}}>{ticket.id}</span>
                <h4 className={styles.ticketEquipName}>{ticket.equipoNombre}</h4>
                <p className={styles.ticketFailureDesc}>{ticket.falla}</p>
              </div>
              
              <div style={{margin: '0.5rem 0'}}>
                <strong>Estado: </strong>
                {ticket.estado === 'Pendiente' && <span className={`${styles.badge} ${styles.badgeDanger}`}>Pendiente</span>}
                {ticket.estado === 'En Proceso' && <span className={`${styles.badge} ${styles.badgeWarning}`}>En Proceso</span>}
                {ticket.estado === 'Resuelto' && <span className={`${styles.badge} ${styles.badgeSuccess}`}>Resuelto</span>}
              </div>

              <div className={styles.ticketMetaRow}>
                <span>Reportado por: <strong>{ticket.reportadoPor}</strong></span>
                <span>{ticket.fecha}</span>
              </div>

              {ticket.estado !== 'Resuelto' && (
                <div className={styles.ticketActions}>
                  {ticket.estado === 'Pendiente' && (
                    <button className={styles.secondaryBtn} style={{padding: '0.35rem 0.75rem', fontSize: '0.8rem'}} onClick={() => handleUpdateTicketStatus(ticket.id, 'En Proceso')}>
                      Atender Falla
                    </button>
                  )}
                  <button className={styles.primaryBtn} style={{padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#10b981'}} onClick={() => handleOpenSolveTicketModal(ticket)}>
                    Resolver Ticket
                  </button>
                </div>
              )}
            </div>
          ))}
          {filteredTickets.length === 0 && (
            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1', color: '#64748b'}}>
              <span className="material-symbols-rounded" style={{fontSize: '3rem', marginBottom: '0.5rem'}}>task_alt</span>
              <p style={{margin: 0, fontWeight: '600'}}>No se encontraron fallas ni reportes correctivos activos.</p>
            </div>
          )}
        </div>
      )}

      {/* -------------------- 4. TAB: BITÁCORA ANUAL DE MANTENIMIENTO -------------------- */}
      {activeTab === 'historial' && (
        <>
          {/* Controles: Año y Área */}
          <div style={{display:'flex', gap:'1rem', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', background:'#ffffff', padding:'1rem 1.25rem', borderRadius:'14px', border:'1px solid #e2e8f0', boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <span className="material-symbols-rounded" style={{color:'#2563eb', fontSize:'1.2rem'}}>calendar_today</span>
              <label style={{fontWeight:'600', color:'#1e293b', fontSize:'0.875rem', whiteSpace:'nowrap'}}>Año:</label>
              <select className={styles.filterSelect} value={bitacoraYear} onChange={e => setBitacoraYear(Number(e.target.value))}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <span className="material-symbols-rounded" style={{color:'#7c3aed', fontSize:'1.2rem'}}>science</span>
              <label style={{fontWeight:'600', color:'#1e293b', fontSize:'0.875rem', whiteSpace:'nowrap'}}>Área:</label>
              <select className={styles.filterSelect} value={bitacoraAreaFilter} onChange={e => setBitacoraAreaFilter(e.target.value)}>
                <option value="Todos">Todas las Áreas</option>
                <option value="HEMATOLOGÍA">Hematología</option>
                <option value="QUÍMICA CLÍNICA">Química Clínica</option>
                <option value="UROANÁLISIS">Uroanálisis</option>
                <option value="MICROBIOLOGÍA">Microbiología</option>
              </select>
            </div>
            <div style={{marginLeft:'auto', display:'flex', gap:'1.5rem', fontSize:'0.85rem', color:'#64748b'}}>
              <span><strong style={{color:'#1e293b'}}>{bitacoraEquipments.length}</strong> equipos</span>
              <span>Registros {bitacoraYear}: <strong style={{color:'#2563eb'}}>
                {Object.values(bitacoraData).reduce((s, mths) => s + Object.values(mths).filter(m => m.calver || m.mtto).length, 0)}
              </strong></span>
            </div>
          </div>

          {/* Referencia de colores (formato Excel Solcan) */}
          <div style={{display:'flex', gap:'0.75rem', marginBottom:'1rem', flexWrap:'wrap', padding:'0.55rem 1rem', background:'#f8fafc', borderRadius:'10px', border:'1px solid #e2e8f0', alignItems:'center'}}>
            <span style={{fontSize:'0.72rem', fontWeight:'700', color:'#475569', letterSpacing:'0.04em', whiteSpace:'nowrap'}}>REFERENCIA:</span>
            {[
              {bg:'#dbeafe', border:'#3b82f6',           text:'Cal. en proceso', textColor:'#1e40af'},
              {bg:'#fef9c3', border:'#ca8a04',           text:'Mto. Preventivo', textColor:'#854d0e'},
              {bg:'#dcfce7', border:'#16a34a',           text:'Mto. Correctivo', textColor:'#166534'},
              {bg:'#ffedd5', border:'#f97316',           text:'Calibración/Ver.', textColor:'#9a3412'},
              {bg:'rgba(239,68,68,0.1)',  border:'#fca5a5', text:'Pendiente',      textColor:'#dc2626'},
              {bg:'rgba(37,99,235,0.05)', border:'#bfdbfe', text:'Programado',     textColor:'#1d4ed8'},
            ].map(s => (
              <span key={s.text} style={{display:'flex', alignItems:'center', gap:'0.35rem', fontSize:'0.72rem', color:s.textColor, fontWeight:'600', whiteSpace:'nowrap'}}>
                <span style={{width:'13px', height:'13px', borderRadius:'3px', background:s.bg, border:`1.5px solid ${s.border}`, display:'inline-block', flexShrink:0}}></span>
                {s.text}
              </span>
            ))}
            <span style={{marginLeft:'auto', fontSize:'0.69rem', color:'#94a3b8', display:'flex', alignItems:'center', gap:'0.25rem', whiteSpace:'nowrap'}}>
              <span className="material-symbols-rounded" style={{fontSize:'0.9rem'}}>touch_app</span>
              Clic → ver comprobante
            </span>
          </div>

          {/* Tabla Matricial Anual */}
          <div style={{overflowX:'auto', borderRadius:'16px', border:'1px solid #d1d9e6', boxShadow:'0 2px 16px rgba(0,0,0,0.06)', background:'#fff'}}>
            <table style={{width:'100%', borderCollapse:'collapse', minWidth:'1950px', fontSize:'0.76rem'}}>
              <thead>
                <tr style={{background:'#1e3a5f', color:'white'}}>
                  <th rowSpan={2} style={{padding:'0.6rem 0.5rem', textAlign:'center', minWidth:'95px', maxWidth:'95px', borderRight:'1px solid rgba(255,255,255,0.2)', position:'sticky', left:0, zIndex:5, background:'#1e3a5f', verticalAlign:'middle', fontSize:'0.7rem', fontWeight:'700', letterSpacing:'0.06em'}}>ÁREA</th>
                  <th rowSpan={2} style={{padding:'0.6rem 0.75rem', textAlign:'left', minWidth:'220px', borderRight:'1px solid rgba(255,255,255,0.15)', position:'sticky', left:95, zIndex:5, background:'#1e3a5f', verticalAlign:'middle', fontSize:'0.7rem', fontWeight:'700'}}>NOMBRE DEL EQUIPO Y SERIE</th>
                  <th rowSpan={2} style={{padding:'0.6rem 0.6rem', textAlign:'center', minWidth:'125px', borderRight:'1px solid rgba(255,255,255,0.15)', position:'sticky', left:315, zIndex:5, background:'#1e3a5f', verticalAlign:'middle', fontSize:'0.66rem', fontWeight:'700', lineHeight:'1.3'}}>N° DE<br/>INVENTARIO</th>
                  <th rowSpan={2} style={{padding:'0.6rem 0.4rem', textAlign:'center', minWidth:'72px', borderRight:'2px solid rgba(255,255,255,0.4)', position:'sticky', left:440, zIndex:5, background:'#1e3a5f', verticalAlign:'middle', fontSize:'0.62rem', fontWeight:'700', lineHeight:'1.3'}}>ENTRA EN<br/>ALCANCE</th>
                  {MESES.map(m => (
                    <th key={m.num} colSpan={2} style={{padding:'0.45rem 0.2rem', textAlign:'center', borderRight:'1px solid rgba(255,255,255,0.15)', borderBottom:'1px solid rgba(255,255,255,0.25)', minWidth:'108px', fontWeight:'800', letterSpacing:'0.04em', fontSize:'0.73rem'}}>
                      {m.label.toUpperCase()}
                    </th>
                  ))}
                </tr>
                <tr style={{background:'#17335a'}}>
                  {MESES.map(m => (
                    <React.Fragment key={m.num}>
                      <th style={{padding:'0.3rem 0.2rem', textAlign:'center', fontSize:'0.65rem', color:'#93c5fd', fontWeight:'800', borderRight:'1px solid rgba(255,255,255,0.08)', whiteSpace:'nowrap'}}>CAL/VER</th>
                      <th style={{padding:'0.3rem 0.2rem', textAlign:'center', fontSize:'0.65rem', color:'#6ee7b7', fontWeight:'800', borderRight:'1px solid rgba(255,255,255,0.2)', whiteSpace:'nowrap'}}>MTTO</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  if (bitacoraEquipments.length === 0) {
                    return (
                      <tr>
                        <td colSpan={28} style={{padding:'4rem', textAlign:'center', color:'#94a3b8'}}>
                          <span className="material-symbols-rounded" style={{fontSize:'3rem', display:'block', marginBottom:'0.5rem'}}>devices_other</span>
                          No hay equipos activos para el área seleccionada en {selectedSucursal}.
                        </td>
                      </tr>
                    );
                  }

                  const areaGroups = {};
                  bitacoraEquipments.forEach(eq => {
                    if (!areaGroups[eq.area]) areaGroups[eq.area] = [];
                    areaGroups[eq.area].push(eq.id);
                  });
                  const areaRendered = {};

                  const fmtDate = (iso) => {
                    if (!iso) return '';
                    const [y, mo, d] = iso.split('-');
                    return `${d}/${mo}/${y}`;
                  };

                  const today = new Date();
                  const todayYear = today.getFullYear();
                  const todayMonth = today.getMonth() + 1;

                  const getCellStatus = (eqId, monthNum, hasRecord) => {
                    const isExpected = (expectedMaintenanceMonths[eqId] || new Set()).has(monthNum);
                    if (hasRecord) return 'done';
                    if (!isExpected) return 'none';
                    if (bitacoraYear < todayYear || (bitacoraYear === todayYear && monthNum < todayMonth)) return 'overdue';
                    if (bitacoraYear === todayYear && monthNum === todayMonth) return 'due';
                    return 'scheduled';
                  };

                  // Colores por TIPO de servicio (esquema Excel Solcan)
                  const TYPE_COLORS = {
                    'Calibración':   { bg: '#ffedd5', text: '#9a3412' }, // NARANJA
                    'Verificación':  { bg: '#ffedd5', text: '#9a3412' }, // NARANJA
                    'En Proceso':    { bg: '#dbeafe', text: '#1e40af' }, // AZUL
                    'Mantenimiento': { bg: '#fef9c3', text: '#854d0e' }, // AMARILLO
                    'Preventivo':    { bg: '#fef9c3', text: '#854d0e' }, // AMARILLO
                    'Correctivo':    { bg: '#dcfce7', text: '#166534' }, // VERDE
                  };
                  // Estado cuando NO hay registro pero sí hay programación
                  const STATUS = {
                    done:      { bg: 'transparent',           text: '',       color: '' },
                    overdue:   { bg: 'rgba(239,68,68,0.09)',  text: 'Pend.',  color: '#dc2626' },
                    due:       { bg: 'rgba(245,158,11,0.11)', text: '¡Hoy!',  color: '#b45309' },
                    scheduled: { bg: 'rgba(37,99,235,0.05)',  text: 'Prog.',  color: '#93c5fd' },
                    none:      { bg: 'transparent',           text: '',       color: '' },
                  };

                  return bitacoraEquipments.map((eq, idx) => {
                    const months = bitacoraData[eq.id] || {};
                    const areaStyle = getAreaColor(eq.area);
                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                    const isFirstInArea = !areaRendered[eq.area];
                    if (isFirstInArea) areaRendered[eq.area] = true;
                    const areaRowSpan = areaGroups[eq.area].length;

                    return (
                      <tr key={eq.id} style={{background:rowBg, borderBottom:'1px solid #e8eef5'}}>

                        {/* ÁREA — rowSpan sticky con texto vertical */}
                        {isFirstInArea && (
                          <td rowSpan={areaRowSpan} style={{
                            padding:'0.5rem 0.3rem', position:'sticky', left:0, zIndex:2,
                            background:areaStyle.bg, borderRight:'1px solid #cbd5e1',
                            borderBottom:'3px solid #94a3b8', textAlign:'center',
                            verticalAlign:'middle', maxWidth:'95px', width:'95px'
                          }}>
                            <span style={{
                              display:'inline-block', writingMode:'vertical-rl',
                              transform:'rotate(180deg)', fontWeight:'900',
                              color:areaStyle.text, fontSize:'0.68rem',
                              letterSpacing:'0.1em', whiteSpace:'nowrap'
                            }}>{eq.area}</span>
                          </td>
                        )}

                        {/* NOMBRE Y SERIE */}
                        <td style={{padding:'0.5rem 0.75rem', position:'sticky', left:95, background:rowBg, zIndex:1, borderRight:'1px solid #e2e8f0'}}>
                          <div style={{fontWeight:'600', color:'#0f172a', lineHeight:'1.3', fontSize:'0.78rem'}}>{eq.nombre}</div>
                          <div style={{fontSize:'0.67rem', color:'#94a3b8', marginTop:'0.1rem'}}>Serie: {eq.serie}</div>
                        </td>

                        {/* N° INVENTARIO */}
                        <td style={{padding:'0.5rem 0.6rem', fontFamily:'monospace', fontSize:'0.72rem', color:'#475569', fontWeight:'600', position:'sticky', left:315, background:rowBg, zIndex:1, borderRight:'1px solid #e2e8f0', textAlign:'center', whiteSpace:'nowrap'}}>
                          {eq.id}
                        </td>

                        {/* ENTRA ALCANCE */}
                        <td style={{padding:'0.5rem 0.4rem', textAlign:'center', position:'sticky', left:440, background:rowBg, zIndex:1, borderRight:'2px solid #cbd5e1'}}>
                          {eq.entraAlcance !== false && (
                            <span style={{fontWeight:'900', color:'#1e293b', fontSize:'1rem', lineHeight:1}}>X</span>
                          )}
                        </td>

                        {/* 12 meses × CAL/VER + MTTO con semáforo */}
                        {MESES.map(m => {
                          const md = months[m.num] || {};
                          const hasRecord = !!(md.calver || md.mtto);
                          const cellStatus = getCellStatus(eq.id, m.num, hasRecord);
                          const st = STATUS[cellStatus];

                          const calverEntry = md.entries?.find(e => e.subtipo === 'Calibración' || e.subtipo === 'Verificación' || e.subtipo === 'En Proceso');
                          const mttoEntry   = md.entries?.find(e => e.subtipo === 'Mantenimiento' || e.subtipo === 'Preventivo' || e.subtipo === 'Correctivo' || (!e.subtipo && e.tipo === 'Preventivo'));
                          const anyEntry    = md.entries?.[0];

                          const calClickable = !!(md.calver && anyEntry);
                          const mttoClickable = !!(md.mtto && anyEntry);

                          // Colores por tipo de servicio
                          const calColor = calverEntry ? (TYPE_COLORS[calverEntry.subtipo] || TYPE_COLORS['Calibración']) : null;
                          const calBg = calColor ? calColor.bg : (md.mtto ? 'transparent' : st.bg);
                          const mttoSubtype = mttoEntry?.subtipo || md.mttoSubtipo || (md.mtto ? 'Mantenimiento' : null);
                          const mttoColor = mttoSubtype ? (TYPE_COLORS[mttoSubtype] || TYPE_COLORS['Mantenimiento']) : null;
                          const mttoBg = mttoColor ? mttoColor.bg : (!md.calver ? st.bg : 'transparent');
                          const mttoLabel = mttoSubtype === 'Correctivo' ? 'Mto. Corr.' : 'MTTO.';

                          return (
                            <React.Fragment key={m.num}>
                              {/* CAL/VER — NARANJA=Cal/Ver, AZUL=En Proceso */}
                              <td
                                onClick={() => { if (calClickable) handleOpenPreview(calverEntry || anyEntry, eq); }}
                                title={md.calver ? `Ver comprobante — ${md.calver}` : ''}
                                style={{
                                  padding:'0.3rem 0.15rem', textAlign:'center',
                                  borderRight:'1px solid #eff2f7', verticalAlign:'middle',
                                  minWidth:'50px', background: calBg,
                                  cursor: calClickable ? 'pointer' : 'default',
                                }}
                              >
                                {md.calver ? (
                                  <div>
                                    <div style={{fontSize:'0.62rem', color: calColor?.text || '#9a3412', fontWeight:'700', lineHeight:'1.25'}}>
                                      {md.calver === 'En Proceso' ? 'En proc.' : md.calver}
                                    </div>
                                    {calverEntry?.fecha && <div style={{fontSize:'0.55rem', color:'#64748b', marginTop:'0.1rem'}}>{fmtDate(calverEntry.fecha)}</div>}
                                    {calverEntry?.evidenciaNombre && <div style={{fontSize:'0.52rem', color:'#1d4ed8', marginTop:'0.1rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.1rem'}}><span className="material-symbols-rounded" style={{fontSize:'0.75rem'}}>attach_file</span>ver</div>}
                                  </div>
                                ) : (
                                  cellStatus !== 'none' && !hasRecord
                                    ? <span style={{fontSize:'0.56rem', fontWeight:'700', color:st.color}}>{st.text}</span>
                                    : null
                                )}
                              </td>
                              {/* MTTO — AMARILLO=Preventivo, VERDE=Correctivo */}
                              <td
                                onClick={() => { if (mttoClickable) handleOpenPreview(mttoEntry || anyEntry, eq); }}
                                title={md.mtto ? `Ver comprobante — ${mttoLabel} ${md.mttoFecha ? fmtDate(md.mttoFecha) : ''}` : ''}
                                style={{
                                  padding:'0.3rem 0.15rem', textAlign:'center',
                                  borderRight:'1px solid #e2e8f0', verticalAlign:'middle',
                                  minWidth:'50px', background: mttoBg,
                                  cursor: mttoClickable ? 'pointer' : 'default',
                                }}
                              >
                                {md.mtto ? (
                                  <div>
                                    <div style={{fontSize:'0.63rem', color: mttoColor?.text || '#854d0e', fontWeight:'800', lineHeight:'1.2'}}>{mttoLabel}</div>
                                    {md.mttoFecha && <div style={{fontSize:'0.55rem', color:'#64748b', marginTop:'0.1rem'}}>{fmtDate(md.mttoFecha)}</div>}
                                    {mttoEntry?.evidenciaNombre && <div style={{fontSize:'0.52rem', color:'#1d4ed8', marginTop:'0.1rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.1rem'}}><span className="material-symbols-rounded" style={{fontSize:'0.75rem'}}>attach_file</span>ver</div>}
                                  </div>
                                ) : (
                                  !md.calver && cellStatus !== 'none'
                                    ? <span style={{fontSize:'0.56rem', fontWeight:'700', color:st.color}}>{st.text}</span>
                                    : null
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Leyenda columnas */}
          <div style={{display:'flex', gap:'2rem', marginTop:'0.75rem', padding:'0.6rem 1.25rem', background:'#f8fafc', borderRadius:'10px', border:'1px solid #e2e8f0', flexWrap:'wrap', alignItems:'center'}}>
            <span style={{fontSize:'0.78rem', color:'#475569', display:'flex', alignItems:'center', gap:'0.4rem'}}>
              <strong style={{color:'#1d4ed8'}}>CAL/VER</strong> = Calibración o Verificación registrada
            </span>
            <span style={{fontSize:'0.78rem', color:'#475569', display:'flex', alignItems:'center', gap:'0.4rem'}}>
              <strong style={{color:'#047857'}}>MTTO.</strong> = Mantenimiento preventivo realizado
            </span>
            <span style={{fontSize:'0.78rem', color:'#94a3b8', display:'flex', alignItems:'center', gap:'0.3rem'}}>
              <span className="material-symbols-rounded" style={{fontSize:'0.9rem'}}>attach_file</span> = Tiene comprobante adjunto (haz clic)
            </span>
          </div>
        </>
      )}

      {/* ==================== MODAL: EQUIPMENTS CRUD ==================== */}
      {showEquipModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalLarge}>
            <div className={styles.modalHeader}>
              <h3>
                <span className="material-symbols-rounded">devices</span>
                {isEditingEquip ? 'Editar Equipo Técnico' : 'Registrar Equipo Técnico'}
              </h3>
              <button className={styles.closeBtn} onClick={() => setShowEquipModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmitEquip} className={styles.fullForm}>
              <div className={styles.formContent}>
                <div className={styles.formGrid}>
                  <div className={styles.fieldGroup}>
                    <label>Nombre del Analizador / Equipo</label>
                    <input 
                      type="text" 
                      required 
                      value={equipForm.nombre}
                      onChange={(e) => setEquipForm({ ...equipForm, nombre: e.target.value })}
                      placeholder="Ej. Analizador de Química Vitros 4600"
                    />
                  </div>

                  <div className={styles.row}>
                    <div className={styles.fieldGroup}>
                      <label>Marca</label>
                      <input 
                        type="text" 
                        required 
                        value={equipForm.marca}
                        onChange={(e) => setEquipForm({ ...equipForm, marca: e.target.value })}
                        placeholder="Ej. Ortho Clinical"
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label>Modelo</label>
                      <input 
                        type="text" 
                        required 
                        value={equipForm.modelo}
                        onChange={(e) => setEquipForm({ ...equipForm, modelo: e.target.value })}
                        placeholder="Ej. Vitros 4600"
                      />
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.fieldGroup}>
                      <label>Número de Serie</label>
                      <input 
                        type="text" 
                        required 
                        value={equipForm.serie}
                        onChange={(e) => setEquipForm({ ...equipForm, serie: e.target.value })}
                        placeholder="Ej. VIT-4600-XYZ"
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label>Área Asignada</label>
                      <select value={equipForm.area} onChange={(e) => setEquipForm({ ...equipForm, area: e.target.value })}>
                        <option value="HEMATOLOGÍA">Hematología</option>
                        <option value="QUÍMICA CLÍNICA">Química Clínica</option>
                        <option value="UROANÁLISIS">Uroanálisis</option>
                        <option value="MICROBIOLOGÍA">Microbiología</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.fieldGroup}>
                      <label>Frecuencia de Mantenimiento</label>
                      <select value={equipForm.frecuencia} onChange={(e) => handleEquipFrecuencyChange(e.target.value)}>
                        <option value="Mensual">Mensual</option>
                        <option value="Trimestral">Trimestral</option>
                        <option value="Semestral">Semestral</option>
                        <option value="Anual">Anual</option>
                      </select>
                    </div>
                    <div className={styles.fieldGroup}>
                      <label>Último Mantenimiento</label>
                      <input 
                        type="date" 
                        required
                        value={equipForm.ultimoManto}
                        onChange={(e) => handleEquipLastMantoChange(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Próximo Mantenimiento Programado</label>
                    <input 
                      type="date" 
                      required
                      value={equipForm.proximoManto}
                      onChange={(e) => setEquipForm({ ...equipForm, proximoManto: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowEquipModal(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: REGISTRAR MANTENIMIENTO PREVENTIVO ==================== */}
      {showLogMantoModal && targetMantoItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalLarge}>
            <div className={styles.modalHeader}>
              <h3>
                <span className="material-symbols-rounded">edit_calendar</span>
                Registrar Servicio Preventivo
              </h3>
              <button className={styles.closeBtn} onClick={() => setShowLogMantoModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmitMantoLog} className={styles.fullForm}>
              <div className={styles.formContent}>
                <div style={{background: '#f8fafc', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid #e2e8f0'}}>
                  <strong style={{color: '#1e293b'}}>{targetMantoItem.nombre}</strong>
                  <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem'}}>
                    Área: {targetMantoItem.area} | Serie: {targetMantoItem.serie} | Frecuencia: {targetMantoItem.frecuencia}
                  </div>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.row}>
                    <div className={styles.fieldGroup}>
                      <label>Fecha de Realización</label>
                      <input 
                        type="date" 
                        required
                        value={mantoForm.fecha}
                        onChange={(e) => setMantoForm({ ...mantoForm, fecha: e.target.value })}
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label>Costo del Servicio ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={mantoForm.costo}
                        onChange={(e) => setMantoForm({ ...mantoForm, costo: e.target.value })}
                        placeholder="Ej. 2500"
                      />
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Técnico o Empresa Responsable</label>
                    <input 
                      type="text" 
                      required
                      value={mantoForm.realizadoPor}
                      onChange={(e) => setMantoForm({ ...mantoForm, realizadoPor: e.target.value })}
                      placeholder="Ej. Ing. Juan Pérez (Ortho Diagnóstica)"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Tipo de Servicio Técnico</label>
                    <select
                      value={mantoForm.subtipo || 'Mantenimiento'}
                      onChange={(e) => setMantoForm({ ...mantoForm, subtipo: e.target.value })}
                    >
                      <option value="Mantenimiento">🟡 Mantenimiento Preventivo — MTTO. realizado</option>
                      <option value="Correctivo">🟢 Mantenimiento Correctivo — Reparación realizada</option>
                      <option value="Calibración">🟠 Calibración realizada — Ajuste metrológico</option>
                      <option value="Verificación">🟠 Verificación realizada — Control de parámetros</option>
                      <option value="En Proceso">🔵 Calibración en proceso — Pendiente de conclusión</option>
                    </select>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Observaciones de Trabajo</label>
                    <textarea 
                      rows="4"
                      required
                      value={mantoForm.observaciones}
                      onChange={(e) => setMantoForm({ ...mantoForm, observaciones: e.target.value })}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Evidencia Fotográfica o PDF (Opcional)</label>
                    {!mantoFile ? (
                      <div 
                        className={`${styles.uploadArea} ${isDragActiveManto ? styles.uploadAreaActive : ''}`}
                        onDragOver={(e) => handleDrag(e, 'manto', true)}
                        onDragLeave={(e) => handleDrag(e, 'manto', false)}
                        onDrop={(e) => handleDrop(e, 'manto')}
                      >
                        <input 
                          type="file" 
                          id="mantoFileInput" 
                          className={styles.fileInputHidden} 
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange(e, 'manto')}
                        />
                        <label htmlFor="mantoFileInput" className={styles.uploadLabel}>
                          <span className="material-symbols-rounded">cloud_upload</span>
                          <span className={styles.uploadText}>Arrastra y suelta tu archivo aquí o <span className={styles.browseText}>busca un archivo</span></span>
                          <span className={styles.uploadSubtext}>Formatos admitidos: JPG, PNG, PDF (Máx. 10MB)</span>
                        </label>
                      </div>
                    ) : (
                      <div className={styles.filePreviewContainer}>
                        <div className={styles.filePreviewHeader}>
                          <div className={styles.filePreviewInfo}>
                            <span className="material-symbols-rounded" style={{color: mantoFile.type.includes('pdf') ? '#ef4444' : '#2563eb'}}>
                              {mantoFile.type.includes('pdf') ? 'picture_as_pdf' : 'image'}
                            </span>
                            <div>
                              <span className={styles.fileName} title={mantoFile.name}>{mantoFile.name}</span>
                              <span className={styles.fileSize}>{mantoFile.size}</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            className={styles.removeFileBtn} 
                            onClick={() => setMantoFile(null)}
                            title="Eliminar archivo"
                          >
                            <span className="material-symbols-rounded">close</span>
                          </button>
                        </div>
                        
                        <div className={styles.fileVisualPreview}>
                          {mantoFile.type.startsWith('image/') ? (
                            <img 
                              src={mantoFile.url} 
                              alt="Previsualización de evidencia" 
                              className={styles.previewImage}
                            />
                          ) : mantoFile.type.includes('pdf') ? (
                            <iframe 
                              src={`${mantoFile.url}#toolbar=0&navpanes=0&scrollbar=0`}
                              title="Previsualización de PDF" 
                              className={styles.previewPdf}
                            />
                          ) : (
                            <div className={styles.previewUnsupported}>
                              <span className="material-symbols-rounded">insert_drive_file</span>
                              <span>Previsualización no disponible para este formato</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowLogMantoModal(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn} disabled={saving}>
                  {saving ? 'Registrando...' : 'Registrar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: REPORTAR FALLA TÉCNICA (CREAR TICKET) ==================== */}
      {showTicketModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalLarge}>
            <div className={styles.modalHeader}>
              <h3 style={{color: '#ef4444'}}>
                <span className="material-symbols-rounded">report_problem</span>
                Reportar Falla Técnica ({selectedSucursal})
              </h3>
              <button className={styles.closeBtn} onClick={() => setShowTicketModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmitTicket} className={styles.fullForm}>
              <div className={styles.formContent}>
                <div className={styles.formGrid}>
                  <div className={styles.fieldGroup}>
                    <label>Seleccionar Analizador / Equipo dañado</label>
                    <select value={ticketForm.equipoId} onChange={(e) => setTicketForm({ ...ticketForm, equipoId: e.target.value })} required>
                      {scopedEquipments.filter(eq => eq.estatus === 'Activo').map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.nombre} (Serie: {eq.serie} - {eq.area})</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.fieldGroup}>
                      <label>Reportante (Químico / Auxiliar)</label>
                      <input 
                        type="text" 
                        required
                        value={ticketForm.reportadoPor}
                        onChange={(e) => setTicketForm({ ...ticketForm, reportadoPor: e.target.value })}
                        placeholder="Ej. Q.F.B. Mariana Torres"
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label>Urgencia de Operación</label>
                      <select value={ticketForm.urgency} onChange={(e) => setTicketForm({ ...ticketForm, urgency: e.target.value })}>
                        <option value="Baja">Baja (No detiene el flujo)</option>
                        <option value="Media">Media (Falla parcial, hay respaldo)</option>
                        <option value="Alta">Alta (Operación detenida del área)</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Descripción Detallada de la Falla o Síntomas</label>
                    <textarea 
                      rows="4"
                      required
                      value={ticketForm.falla}
                      onChange={(e) => setTicketForm({ ...ticketForm, falla: e.target.value })}
                      placeholder="Describa el error en pantalla, códigos de advertencia o síntomas de mal funcionamiento del equipo..."
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowTicketModal(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn} style={{background: '#ef4444'}} disabled={saving}>
                  {saving ? 'Enviando...' : 'Enviar Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: RESOLVER TICKET CORRECTIVO ==================== */}
      {showSolveTicketModal && targetTicket && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalLarge}>
            <div className={styles.modalHeader}>
              <h3 style={{color: '#10b981'}}>
                <span className="material-symbols-rounded">task_alt</span>
                Registrar Solución Técnica (Ticket Correctivo)
              </h3>
              <button className={styles.closeBtn} onClick={() => setShowSolveTicketModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmitSolveTicket} className={styles.fullForm}>
              <div className={styles.formContent}>
                <div style={{background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.15)'}}>
                  <strong style={{color: '#b91c1c'}}>{targetTicket.equipoNombre}</strong>
                  <div style={{fontSize: '0.85rem', color: '#475569', marginTop: '0.4rem'}}>
                    <strong>Falla Reportada: </strong> "{targetTicket.falla}"
                  </div>
                  <div style={{fontSize: '0.775rem', color: '#64748b', marginTop: '0.2rem'}}>
                    Reportó: {targetTicket.reportadoPor} | Área: {targetTicket.area}
                  </div>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.row}>
                    <div className={styles.fieldGroup}>
                      <label>Fecha de Reparación</label>
                      <input 
                        type="date" 
                        required
                        value={solveTicketForm.fecha}
                        onChange={(e) => setSolveTicketForm({ ...solveTicketForm, fecha: e.target.value })}
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label>Costo de la Reparación / Refacciones ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={solveTicketForm.costo}
                        onChange={(e) => setSolveTicketForm({ ...solveTicketForm, costo: e.target.value })}
                        placeholder="Ej. 4500"
                      />
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Técnico / Especialista a cargo</label>
                    <input 
                      type="text" 
                      required
                      value={solveTicketForm.realizadoPor}
                      onChange={(e) => setSolveTicketForm({ ...solveTicketForm, realizadoPor: e.target.value })}
                      placeholder="Ej. Ing. Mario Gómez (Soporte Biomédico)"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Acciones de Solución Aplicadas</label>
                    <textarea 
                      rows="4"
                      required
                      value={solveTicketForm.observaciones}
                      onChange={(e) => setSolveTicketForm({ ...solveTicketForm, observaciones: e.target.value })}
                      placeholder="Describa el diagnóstico, refacciones cambiadas y pruebas realizadas para certificar el correcto funcionamiento del analizador..."
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Evidencia Fotográfica o PDF (Opcional)</label>
                    {!solveFile ? (
                      <div 
                        className={`${styles.uploadArea} ${isDragActiveSolve ? styles.uploadAreaActive : ''}`}
                        onDragOver={(e) => handleDrag(e, 'solve', true)}
                        onDragLeave={(e) => handleDrag(e, 'solve', false)}
                        onDrop={(e) => handleDrop(e, 'solve')}
                      >
                        <input 
                          type="file" 
                          id="solveFileInput" 
                          className={styles.fileInputHidden} 
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange(e, 'solve')}
                        />
                        <label htmlFor="solveFileInput" className={styles.uploadLabel}>
                          <span className="material-symbols-rounded">cloud_upload</span>
                          <span className={styles.uploadText}>Arrastra y suelta tu archivo aquí o <span className={styles.browseText}>busca un archivo</span></span>
                          <span className={styles.uploadSubtext}>Formatos admitidos: JPG, PNG, PDF (Máx. 10MB)</span>
                        </label>
                      </div>
                    ) : (
                      <div className={styles.filePreviewContainer}>
                        <div className={styles.filePreviewHeader}>
                          <div className={styles.filePreviewInfo}>
                            <span className="material-symbols-rounded" style={{color: solveFile.type.includes('pdf') ? '#ef4444' : '#2563eb'}}>
                              {solveFile.type.includes('pdf') ? 'picture_as_pdf' : 'image'}
                            </span>
                            <div>
                              <span className={styles.fileName} title={solveFile.name}>{solveFile.name}</span>
                              <span className={styles.fileSize}>{solveFile.size}</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            className={styles.removeFileBtn} 
                            onClick={() => setSolveFile(null)}
                            title="Eliminar archivo"
                          >
                            <span className="material-symbols-rounded">close</span>
                          </button>
                        </div>
                        
                        <div className={styles.fileVisualPreview}>
                          {solveFile.type.startsWith('image/') ? (
                            <img 
                              src={solveFile.url} 
                              alt="Previsualización de evidencia" 
                              className={styles.previewImage}
                            />
                          ) : solveFile.type.includes('pdf') ? (
                            <iframe 
                              src={`${solveFile.url}#toolbar=0&navpanes=0&scrollbar=0`}
                              title="Previsualización de PDF" 
                              className={styles.previewPdf}
                            />
                          ) : (
                            <div className={styles.previewUnsupported}>
                              <span className="material-symbols-rounded">insert_drive_file</span>
                              <span>Previsualización no disponible para este formato</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowSolveTicketModal(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn} style={{background: '#10b981'}} disabled={saving}>
                  {saving ? 'Archivando...' : 'Archivar y Cerrar Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ==================== MODAL: PREVISUALIZACIÓN DE COMPROBANTE ==================== */}
      {showPreviewModal && previewEntry && previewEq && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalLarge} style={{maxWidth:'760px'}}>
            <div className={styles.modalHeader}>
              <h3 style={{color:'#1e293b'}}>
                <span className="material-symbols-rounded">receipt_long</span>
                Comprobante de Mantenimiento
              </h3>
              <button className={styles.closeBtn} onClick={() => setShowPreviewModal(false)}>&times;</button>
            </div>
            <div className={styles.formContent}>

              {/* Equipo info */}
              <div style={{background:'linear-gradient(135deg,#eff6ff,#f8fafc)', padding:'1rem 1.25rem', borderRadius:'12px', marginBottom:'1.25rem', border:'1px solid #dbeafe', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.75rem'}}>
                <div>
                  <div style={{fontWeight:'800', color:'#1e293b', fontSize:'0.95rem', lineHeight:'1.3'}}>{previewEq.nombre}</div>
                  <div style={{fontSize:'0.8rem', color:'#64748b', marginTop:'0.25rem'}}>
                    {previewEq.area} &nbsp;·&nbsp; Serie: <strong style={{fontFamily:'monospace'}}>{previewEq.serie}</strong>
                  </div>
                </div>
                <span className={`${styles.badge} ${previewEntry.subtipo === 'Calibración' || previewEntry.subtipo === 'Verificación' ? styles.badgeInfo : styles.badgeSuccess}`}
                  style={{fontSize:'0.78rem', padding:'0.3rem 0.75rem'}}>
                  {previewEntry.subtipo || previewEntry.tipo || 'Servicio'}
                </span>
              </div>

              {/* Detalle del servicio */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'1.25rem'}}>
                {[
                  {icon:'event',        label:'FECHA DE SERVICIO',   value: previewEntry.fecha},
                  {icon:'engineering',  label:'TÉCNICO RESPONSABLE', value: previewEntry.realizadoPor},
                  {icon:'payments',     label:'COSTO',               value: `$${(previewEntry.costo||0).toLocaleString('es-MX',{minimumFractionDigits:2})}`},
                  {icon:'location_on',  label:'SUCURSAL',            value: previewEntry.sucursal},
                ].map(item => (
                  <div key={item.label} style={{background:'#f8fafc', padding:'0.75rem 1rem', borderRadius:'10px', border:'1px solid #e2e8f0'}}>
                    <div style={{fontSize:'0.67rem', color:'#94a3b8', fontWeight:'700', letterSpacing:'0.06em', marginBottom:'0.25rem', display:'flex', alignItems:'center', gap:'0.25rem'}}>
                      <span className="material-symbols-rounded" style={{fontSize:'0.85rem'}}>{item.icon}</span>
                      {item.label}
                    </div>
                    <div style={{fontSize:'0.9rem', color:'#1e293b', fontWeight:'700'}}>{item.value || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Observaciones */}
              {previewEntry.observaciones && (
                <div style={{background:'#f8fafc', padding:'1rem 1.25rem', borderRadius:'10px', marginBottom:'1.25rem', border:'1px solid #e2e8f0'}}>
                  <div style={{fontSize:'0.67rem', color:'#94a3b8', fontWeight:'700', letterSpacing:'0.06em', marginBottom:'0.5rem'}}>OBSERVACIONES DE TRABAJO</div>
                  <div style={{fontSize:'0.85rem', color:'#475569', lineHeight:'1.65'}}>{previewEntry.observaciones}</div>
                </div>
              )}

              {/* Previsualización de comprobante */}
              <div style={{fontSize:'0.67rem', color:'#94a3b8', fontWeight:'700', letterSpacing:'0.06em', marginBottom:'0.75rem'}}>COMPROBANTE / CARTA DE SERVICIO</div>
              {previewEntry.evidenciaNombre && previewEntry.evidenciaUrl ? (
                <div style={{borderRadius:'12px', overflow:'hidden', border:'1px solid #e2e8f0', background:'#f8fafc'}}>
                  <div style={{background:'#f1f5f9', padding:'0.6rem 1rem', display:'flex', alignItems:'center', gap:'0.5rem', borderBottom:'1px solid #e2e8f0'}}>
                    <span className="material-symbols-rounded" style={{fontSize:'1.1rem', color: previewEntry.evidenciaNombre.toLowerCase().endsWith('.pdf') ? '#ef4444' : '#2563eb'}}>
                      {previewEntry.evidenciaNombre.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'image'}
                    </span>
                    <span style={{fontSize:'0.82rem', color:'#1e293b', fontWeight:'600', flex:1}}>{previewEntry.evidenciaNombre}</span>
                    <a href={previewEntry.evidenciaUrl} download={previewEntry.evidenciaNombre}
                       style={{display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.75rem', color:'#2563eb', fontWeight:'600', textDecoration:'none'}}>
                      <span className="material-symbols-rounded" style={{fontSize:'1rem'}}>download</span> Descargar
                    </a>
                  </div>
                  {previewEntry.evidenciaNombre.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={`${previewEntry.evidenciaUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      title="Comprobante de Mantenimiento"
                      style={{width:'100%', height:'420px', border:'none', display:'block'}}
                    />
                  ) : (
                    <img
                      src={previewEntry.evidenciaUrl}
                      alt="Comprobante de mantenimiento"
                      style={{width:'100%', maxHeight:'420px', objectFit:'contain', display:'block', padding:'1rem'}}
                    />
                  )}
                </div>
              ) : (
                <div style={{textAlign:'center', padding:'2.5rem 1rem', background:'#f8fafc', borderRadius:'12px', border:'1px dashed #cbd5e1'}}>
                  <span className="material-symbols-rounded" style={{fontSize:'3rem', color:'#94a3b8', display:'block', marginBottom:'0.5rem'}}>description</span>
                  <p style={{margin:0, color:'#64748b', fontSize:'0.875rem', fontWeight:'600'}}>Sin comprobante adjunto</p>
                  <p style={{margin:'0.3rem 0 0', color:'#94a3b8', fontSize:'0.8rem'}}>No se adjuntó evidencia al registrar este servicio</p>
                  <p style={{margin:'0.6rem 0 0', fontSize:'0.75rem', color:'#cbd5e1'}}>Para adjuntar, usa el botón "Registrar Manto." en la pestaña Calendario Preventivo</p>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.secondaryBtn} onClick={() => setShowPreviewModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
