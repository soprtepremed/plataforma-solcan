import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { theme } from '../styles/theme';
import { Calendar, RefreshCw, ArrowLeft, ChevronLeft, ChevronRight, FileText, User } from 'lucide-react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../context/AuthContext';

const AREAS_FULL = [
  { key: "hemato", label: "HEMATOLOGÍA" },
  { key: "uro", label: "UROANÁLISIS" },
  { key: "quimica", label: "QUÍMICA CLÍNICA" },
  { key: "archivo", label: "CONTROL/ARCHI" },
  { key: "calidad", label: "CALIDAD" },
  { key: "admin", label: "ADMIN" },
  { key: "recursos", label: "MATERIALES" }
];

const COL_SMALL = 30;
const COL_MED = 45;
const COL_LARGE = 110;
const BORDER_COLOR = '#000';

export default function LogisticaBitacoraMobile({ onBack }) {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Usar fecha local (formato YYYY-MM-DD) para evitar problemas de zona horaria con UTC ISO
  const getLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onChangeDate = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const generatePDF = async () => {
    try {
      setLoading(true);

      const safeTime = (iso) => {
        if (!iso) return null;
        try {
          if (typeof iso === 'string' && iso.includes(':') && iso.length <= 8 && !iso.includes('-')) {
            return iso.substring(0, 5);
          }
          const d = new Date(iso);
          if (isNaN(d.getTime())) return null;
          const h = d.getHours().toString().padStart(2, '0');
          const m = d.getMinutes().toString().padStart(2, '0');
          return `${h}:${m}`;
        } catch {
          return null;
        }
      };

      const html = `
        <html>
          <head>
            <style>
              @page { size: A3 landscape; margin: 4mm; }
              body { font-family: 'Helvetica', sans-serif; font-size: 5px; color: #000; margin: 0; padding: 0; }
              .header { text-align: center; margin-bottom: 5px; }
              .header h1 { font-size: 13px; margin: 0; }
              table { width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; }
              th, td { border: 1px solid #000; text-align: center; font-size: 5.5px; height: 12px; padding: 1px 0; }
              th { background-color: #f8fafc; font-weight: bold; }
              
              .v-text-box { height: 40px; position: relative; width: 100%; }
              .v-text { 
                transform: rotate(-90deg); 
                white-space: nowrap; 
                position: absolute;
                left: 50%; top: 50%;
                transform-origin: center;
                display: block;
                width: 40px;
                margin-left: -20px;
                font-size: 4px;
                font-weight: bold;
              }

              .col-gen { width: 25px; }
              .col-suc { width: 90px; text-align: left; padding-left: 2px; }
              .col-num { width: 12px; }
              .col-v-long { width: 12px; height: 50px; }
              .col-lab { width: 13px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>SOLCAN LAB - BITÁCORA OFICIAL FO-DO-017</h1>
              <p style="font-size: 7px;">Fecha: ${new Date(selectedDate + 'T12:00:00').toLocaleDateString()} | Chofer: ${user?.name || 'N/A'}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th colspan="3">IDENTIFICACIÓN</th>
                  <th colspan="5">SANGRE</th>
                  <th colspan="9">VARIAS</th>
                  <th colspan="4">FORMATOS</th>
                  ${AREAS_FULL.map(a => `<th colspan="2" style="font-size: 6px; height: 18px;">${a.label}</th>`).join('')}
                </tr>
                <tr>
                  <th rowspan="2" class="col-gen">FECHA</th>
                  <th rowspan="2" class="col-suc">SUCURSAL</th>
                  <th class="col-gen">SALIDA</th>
                  <th colspan="2">SUERO</th>
                  <th colspan="3">S. TOTAL</th>
                  <th rowspan="2" class="col-v-long"><div class="v-text-box"><span class="v-text">ORINA</span></div></th>
                  <th rowspan="2" class="col-v-long"><div class="v-text-box"><span class="v-text">O. 24H</span></div></th>
                  <th rowspan="2" class="col-v-long"><div class="v-text-box"><span class="v-text">M. TRANS</span></div></th>
                  <th rowspan="2" class="col-v-long"><div class="v-text-box"><span class="v-text">HISOPO</span></div></th>
                  <th colspan="2">LAMIN.</th>
                  <th rowspan="2" class="col-v-long"><div class="v-text-box"><span class="v-text">HECES</span></div></th>
                  <th colspan="2">OTROS</th>
                  <th rowspan="2" class="col-v-long"><div class="v-text-box"><span class="v-text">DO-001</span></div></th>
                  <th rowspan="2" class="col-v-long"><div class="v-text-box"><span class="v-text">DA-001</span></div></th>
                  <th rowspan="2" class="col-v-long"><div class="v-text-box"><span class="v-text">GC-020</span></div></th>
                  <th rowspan="2" class="col-v-long"><div class="v-text-box"><span class="v-text">RM-004</span></div></th>
                  ${AREAS_FULL.map(() => `
                    <th class="col-lab"><div class="v-text-box"><span class="v-text">USUARIO</span></div></th>
                    <th class="col-lab"><div class="v-text-box"><span class="v-text">HORARIO</span></div></th>
                  `).join('')}
                </tr>
                <tr>
                  <th class="col-gen">HORA</th>
                  <th class="col-num">ROJ</th>
                  <th class="col-num">DOR</th>
                  <th class="col-num">LIL</th>
                  <th class="col-num">CEL</th>
                  <th class="col-num">VER</th>
                  <th class="col-num">HE</th>
                  <th class="col-num">MI</th>
                  <th class="col-num">CNT</th>
                  <th class="col-num" style="font-size: 3.5px;">ANÁLISIS</th>
                  ${AREAS_FULL.map(() => `<th class="col-lab"></th><th class="col-lab"></th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${data.map(item => `
                  <tr>
                    <td class="col-gen">${new Date(item.created_at).toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit'})}</td>
                    <td class="col-suc">${item.sucursal.substring(0,25)}</td>
                    <td class="col-gen">${safeTime(item.hora_recoleccion) || '-'}</td>
                    <td>${item.s_rojo || '-'}</td>
                    <td>${item.s_dorado || '-'}</td>
                    <td>${item.s_lila || '-'}</td>
                    <td>${item.s_celeste || '-'}</td>
                    <td>${item.s_verde || '-'}</td>
                    <td>${item.s_papel || '-'}</td>
                    <td>${item.s_orina_24h || '-'}</td>
                    <td>${item.s_medio_transporte || '-'}</td>
                    <td>${item.s_hisopo || '-'}</td>
                    <td>${item.s_laminilla_he || '-'}</td>
                    <td>${item.s_laminilla_mi || '-'}</td>
                    <td>${item.s_heces || '-'}</td>
                    <td>${item.s_otros_cant || '-'}</td>
                    <td style="font-size: 4px;">${item.s_otros_analisis ? item.s_otros_analisis.substring(0,8) : '-'}</td>
                    <td>${item.f_do_001 || '-'}</td>
                    <td>${item.f_da_001 || '-'}</td>
                    <td>${item.f_qc_020 || '-'}</td>
                    <td>${item.f_rm_004 || '-'}</td>
                    ${AREAS_FULL.map(a => {
                      const hourVal = safeTime(item[`a_${a.key}_time`]);
                      return `
                        <td>${item[`a_${a.key}_user`] ? item[`a_${a.key}_user`].substring(0,3).toUpperCase() : '-'}</td>
                        <td>${hourVal || '-'}</td>
                      `;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="margin-top: 5px; font-size: 7px; font-weight: bold;">RESPONSABLE: ${user?.name?.toUpperCase() || 'N/A'}</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      const fileName = `reporte de recolecciones ( ${user?.name || 'Chofer'} ) ${selectedDate}.pdf`;

      // Intentar compartir con el nombre sugerido
      await Sharing.shareAsync(uri, { 
        UTI: '.pdf', 
        mimeType: 'application/pdf',
        dialogTitle: fileName // Título del diálogo de compartir
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo generar el PDF");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Permitir rotación automática en esta pantalla
    ScreenOrientation.unlockAsync();

    // Bloquear a vertical al salir
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      const { data: logs, error } = await supabase
        .from("logistica_envios")
        .select("*")
        .or(`mensajero_id.ilike.${user.name},mensajero_id.eq.${user.id}`) // Filtro insensible a mayúsculas y flexible
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setData(logs || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedDate]);

  const formatTime = (isoString) => {
    if (!isoString) return "-";
    // Si ya viene como texto HH:mm (formato del Lab)
    if (typeof isoString === 'string' && isoString.includes(':') && isoString.length <= 8 && !isoString.includes('-')) {
      return isoString.substring(0, 5);
    }
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return "-";
    }
  };

  const renderQty = (val) => {
    if (val === 0 || val === "0" || !val) return '-';
    return val;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER NATIVO PREMIUN */}
      <View style={styles.modernHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backIconButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.screenTag}>REPORTE OFICIAL</Text>
          <Text style={styles.modernTitle}>Bitácora FO-DO-017</Text>
        </View>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={handlePrevDay} style={styles.navBtn}>
            <ChevronLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dateDisplay} 
            activeOpacity={0.7}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={18} color="#3B82F6" style={{ marginRight: 8 }} />
            <Text style={styles.dateText}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              }).toUpperCase()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNextDay} style={styles.navBtn}>
            <ChevronRight size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(selectedDate + 'T12:00:00')}
            mode="date"
            display="default"
            onChange={onChangeDate}
          />
        )}

        <TouchableOpacity 
          style={styles.refreshBtn} 
          onPress={fetchLogs}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <RefreshCw size={20} color="#FFF" />
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.pdfBtn} 
          onPress={generatePDF}
          activeOpacity={0.7}
        >
          <FileText size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* CARD DE RESPONSABLE NATIVO */}
      <View style={styles.driverInfoCard}>
        <View style={styles.driverIconCircle}>
          <User size={18} color="#3B82F6" />
        </View>
        <View>
          <Text style={styles.driverLabel}>RESPONSABLE DE LOGÍSTICA</Text>
          <Text style={styles.driverNameText}>{user?.name?.toUpperCase() || 'ALBERTH'}</Text>
        </View>
      </View>

      <ScrollView horizontal persistentScrollbar style={styles.tableScroll}>
        <View style={styles.tableContainer}>
          {/* NIVEL 1 */}
          <View style={styles.row1}>
            <View style={[styles.hCell, { width: COL_MED + COL_LARGE + COL_MED }]}><Text style={styles.hMainText}> </Text></View>
            <View style={[styles.hCell, { width: COL_SMALL * 5 }]}><Text style={styles.hMainText}>MUESTRAS SANGUINEAS EN TUBO</Text></View>
            <View style={[styles.hCell, { width: COL_SMALL * 9 }]}><Text style={styles.hMainText}>MUESTRAS VARIAS</Text></View>
            <View style={[styles.hCell, { width: COL_SMALL * 4 }]}><Text style={styles.hMainText}>FORMATOS</Text></View>
            <View style={[styles.hCell, { width: (COL_SMALL * 2) * AREAS_FULL.length }]}><Text style={styles.hMainText}>AREA</Text></View>
          </View>

          {/* NIVEL 2 y 3 COMBINADOS PARA SOPORTAR CELDAS COMBINADAS (ROWSPAN) */}
          <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC' }}>
            {/* GRUPO: INFO BASICA */}
            <View>
              <View style={[styles.hCell, { width: COL_MED, height: 65, borderBottomWidth: 0 }]}></View>
              <View style={[styles.hCell, { width: COL_MED, height: 50 }]}><Text style={styles.vLabel}>FECHA</Text></View>
            </View>
            <View>
              <View style={[styles.hCell, { width: COL_LARGE, height: 65, borderBottomWidth: 0 }]}></View>
              <View style={[styles.hCell, { width: COL_LARGE, height: 50 }]}><Text style={styles.vLabel}>*SUCURSAL</Text></View>
            </View>
            <View>
              <View style={[styles.hCell, { width: COL_MED, height: 65 }]}><Text style={styles.hSubTextVertical}>HORARIO SALIDA</Text></View>
              <View style={[styles.hCell, { width: COL_MED, height: 50 }]}><Text style={styles.vLabel}>HORA</Text></View>
            </View>

            {/* GRUPO: MUESTRAS SANGUINEAS */}
            <View>
              <View style={[styles.hCell, { width: COL_SMALL * 2, height: 65 }]}><Text style={styles.hSubText}>SUERO</Text></View>
              <View style={{ flexDirection: 'row' }}>
                <View style={[styles.hCell, { width: COL_SMALL, height: 50 }]}><Text style={styles.vLabel}>ROJO</Text></View>
                <View style={[styles.hCell, { width: COL_SMALL, height: 50 }]}><Text style={styles.vLabel}>DORADO</Text></View>
              </View>
            </View>
            <View>
              <View style={[styles.hCell, { width: COL_SMALL * 3, height: 65 }]}><Text style={styles.hSubText}>SANGRE TOTAL / PLASMA</Text></View>
              <View style={{ flexDirection: 'row' }}>
                <View style={[styles.hCell, { width: COL_SMALL, height: 50 }]}><Text style={styles.vLabel}>LILA</Text></View>
                <View style={[styles.hCell, { width: COL_SMALL, height: 50 }]}><Text style={styles.vLabel}>CELEST</Text></View>
                <View style={[styles.hCell, { width: COL_SMALL, height: 50 }]}><Text style={styles.vLabel}>VERDE</Text></View>
              </View>
            </View>

            {/* GRUPO: MUESTRAS VARIAS (AQUÍ COMBINAMOS CELDAS) */}
            <View style={[styles.hCell, { width: COL_SMALL, height: 115, justifyContent: 'center' }]}><Text style={styles.hSubTextVertical}>ORINA</Text></View>
            <View style={[styles.hCell, { width: COL_SMALL, height: 115, justifyContent: 'center' }]}><Text style={styles.hSubTextVertical}>ORINA 24H</Text></View>
            <View style={[styles.hCell, { width: COL_SMALL, height: 115, justifyContent: 'center' }]}><Text style={styles.hSubTextVertical}>MEDIO TRANS</Text></View>
            <View style={[styles.hCell, { width: COL_SMALL, height: 115, justifyContent: 'center' }]}><Text style={styles.hSubTextVertical}>TUBO HISOPO</Text></View>
            <View>
              <View style={[styles.hCell, { width: COL_SMALL * 2, height: 65 }]}><Text style={styles.hSubText}>LAMINILLA</Text></View>
              <View style={{ flexDirection: 'row' }}>
                <View style={[styles.hCell, { width: COL_SMALL, height: 50 }]}><Text style={styles.vLabel}>HE</Text></View>
                <View style={[styles.hCell, { width: COL_SMALL, height: 50 }]}><Text style={styles.vLabel}>MI</Text></View>
              </View>
            </View>
            <View style={[styles.hCell, { width: COL_SMALL, height: 115, justifyContent: 'center' }]}><Text style={styles.hSubTextVertical}>HECES</Text></View>
            <View>
              <View style={[styles.hCell, { width: COL_SMALL * 2, height: 65 }]}><Text style={styles.hSubText}>OTROS</Text></View>
              <View style={{ flexDirection: 'row' }}>
                <View style={[styles.hCell, { width: COL_SMALL, height: 50 }]}><Text style={styles.vLabel}>CANT</Text></View>
                <View style={[styles.hCell, { width: COL_SMALL, height: 50 }]}><Text style={styles.vLabel}>ANALIS</Text></View>
              </View>
            </View>

            {/* GRUPO: FORMATOS (COMBINADOS) */}
            <View style={[styles.hCell, { width: COL_SMALL, height: 115, justifyContent: 'center' }]}><Text style={styles.hSubTextVertical}>FO-DO-001</Text></View>
            <View style={[styles.hCell, { width: COL_SMALL, height: 115, justifyContent: 'center' }]}><Text style={styles.hSubTextVertical}>FO-DA-001</Text></View>
            <View style={[styles.hCell, { width: COL_SMALL, height: 115, justifyContent: 'center' }]}><Text style={styles.hSubTextVertical}>FO-GC-020</Text></View>
            <View style={[styles.hCell, { width: COL_SMALL, height: 115, justifyContent: 'center' }]}><Text style={styles.hSubTextVertical}>FO-RM-004</Text></View>

            {/* GRUPO: AREAS */}
            {AREAS_FULL.map(a => (
              <View key={`area-group-${a.key}`}>
                <View style={[styles.hCell, { width: COL_SMALL * 2, height: 65 }]}><Text style={styles.areaText}>{a.label}</Text></View>
                <View style={{ flexDirection: 'row' }}>
                  <View style={[styles.hCell, { width: COL_SMALL, height: 50 }]}><Text style={styles.vLabel}>USR</Text></View>
                  <View style={[styles.hCell, { width: COL_SMALL, height: 50 }]}><Text style={styles.vLabel}>HORA</Text></View>
                </View>
              </View>
            ))}
          </View>

          {/* DATOS */}
          <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLogs(); }} />}
          >
            {loading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color="#000" />
            ) : (
              data.map((item) => (
                <View key={item.id} style={styles.dataRow}>
                  <View style={[styles.dCell, { width: COL_MED }]}><Text style={styles.dText}>{new Date(item.created_at).toLocaleDateString([], {day:'2-digit', month:'2-digit'})}</Text></View>
                  <View style={[styles.dCell, { width: COL_LARGE }]}><Text style={styles.dTextBold}>{item.sucursal}</Text></View>
                  <View style={[styles.dCell, { width: COL_MED }]}><Text style={styles.dText}>{item.hora_recoleccion ? new Date(item.hora_recoleccion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</Text></View>
                  
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_rojo)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_dorado)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_lila)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_celeste)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_verde)}</Text></View>

                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_papel)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_orina_24h)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_medio_transporte)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_hisopo)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_laminilla_he)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_laminilla_mi)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_heces)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.s_otros_cant)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dTextSmall}>{item.s_otros_analisis}</Text></View>

                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.f_do_001)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.f_da_001)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.f_qc_020)}</Text></View>
                  <View style={[styles.dCell, { width: COL_SMALL }]}><Text style={styles.dText}>{renderQty(item.f_rm_004)}</Text></View>

                  {AREAS_FULL.map(area => (
                    <React.Fragment key={`area-data-${item.id}-${area.key}`}>
                      <View style={[styles.dCell, { width: COL_SMALL }]}>
                        <Text style={styles.dTextSmall}>{item[`a_${area.key}_user`] ? item[`a_${area.key}_user`].substring(0,3).toUpperCase() : '-'}</Text>
                      </View>
                      <View style={[styles.dCell, { width: COL_SMALL }]}>
                        <Text style={styles.dTextSmall}>{formatTime(item[`a_${area.key}_time`])}</Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  modernHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: { flex: 1 },
  screenTag: { fontSize: 10, fontWeight: '800', color: '#6366F1', letterSpacing: 1, marginBottom: 2 },
  modernTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  
  filterBar: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
    marginRight: 12,
  },
  navBtn: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dateText: { 
    fontSize: 13, 
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  refreshBtn: { 
    backgroundColor: '#0F172A', 
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pdfBtn: { 
    backgroundColor: '#EF4444', 
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  driverInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  driverIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 2 },
  driverNameText: { fontSize: 14, fontWeight: '900', color: '#1E293B', letterSpacing: 0.5 },

  tableScroll: { flex: 1, marginHorizontal: 16 },
  tableContainer: { borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: '#000' },
  
  hCell: {
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    backgroundColor: '#F8F9FA'
  },
  hMainText: { fontSize: 8, fontWeight: '900', textAlign: 'center' },
  hSubText: { fontSize: 7, fontWeight: '800', textAlign: 'center' },
  hSubTextVertical: { 
    fontSize: 6, 
    fontWeight: '900', 
    width: 60,
    transform: [{ rotate: '-90deg' }],
    textAlign: 'center'
  },
  areaText: { fontSize: 6, fontWeight: '900', textAlign: 'center' },
  vLabel: { fontSize: 6, fontWeight: '900', transform: [{ rotate: '-90deg' }], width: 35, textAlign: 'center' },

  row1: { flexDirection: 'row', height: 25 },
  row2: { flexDirection: 'row', height: 65 },
  row3: { flexDirection: 'row', height: 50 },

  dataRow: { flexDirection: 'row', height: 35 },
  dCell: { borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
  dText: { fontSize: 8, fontWeight: '600' },
  dTextBold: { fontSize: 8, fontWeight: '900' },
  dTextSmall: { fontSize: 7 }
});
