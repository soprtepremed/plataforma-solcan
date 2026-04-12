import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Image,
  PanResponder,
  Animated,
  Dimensions,
  Linking,
  Vibration
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { theme } from '../styles/theme';
import { Package, MapPin, ChevronRight, Bell, User, Clock, Menu, X, Info, CheckCircle, AlertTriangle, Truck, Phone, MessageCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Modal, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';

// --- COMPONENTE SWIPE GENÉRICO ---
const SwipeToAccept = ({ onAccept, label = 'Desliza para aceptar →', activeLabel = '¡ACEPTADO!', color = '#3B82F6' }) => {
  const pan = React.useRef(new Animated.ValueXY()).current;
  const [complete, setComplete] = useState(false);
  const maxWidth = Dimensions.get('window').width - 120; // Ajuste según padding

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gesture) => {
        if (gesture.dx > 0 && gesture.dx < maxWidth) {
          pan.setValue({ x: gesture.dx, y: 0 });
        }
      },
      onPanResponderRelease: (e, gesture) => {
        if (gesture.dx >= maxWidth * 0.8) {
          setComplete(true);
          Animated.spring(pan, { toValue: { x: maxWidth, y: 0 }, useNativeDriver: false }).start();
          onAccept();
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.swipeTrack}>
      <Text style={styles.swipeText}>{complete ? activeLabel : label}</Text>
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.swipeHandle, { transform: [{ translateX: pan.x }], backgroundColor: color }]}
      >
        <Truck size={20} color="#FFF" />
      </Animated.View>
    </View>
  );
};

export default function CourierDashboard({ onOpenMenu, onNavigate }) {
  const { user, logout } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Animación de pulso para urgentes
  useEffect(() => {
    if (urgentCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [urgentCount]);

  const addNotification = async (title, message, type = 'info', skipSystem = false) => {
    // 1. Agregar a la lista interna (UI) siempre
    const newNotif = {
      id: Date.now(),
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type
    };
    setNotifications(prev => [newNotif, ...prev]);
    setNotifCount(prev => prev + 1);

    // 2. Disparar Notificación Nativa solo si no se pidió saltar (Evita duplicados con App.js)
    if (skipSystem) return;

    // VIBRACIÓN FÍSICA INMEDIATA
    Vibration.vibrate([0, 250, 250, 250]);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: message,
          sound: true,
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'default',
        },
        trigger: null, // Envío inmediato
      });
    } catch (error) {
      console.log("Error al disparar notificación nativa:", error);
    }
  };

  const triggerLocalNotification = (sucursal) => {
    addNotification("Nueva Solicitud", `Sucursal ${sucursal} pide recolección.`, 'pickup');
  };

  const triggerAcceptanceAlert = (mensajero, sucursal) => {
    addNotification("Recolección Tomada", `${mensajero} ya va en camino a ${sucursal}.`, 'taken');
  };

  const handleAcceptShipment = async (id, sucursalName) => {
    try {
      const { error } = await supabase
        .from('logistica_envios')
        .update({ 
          status: 'En camino', 
          mensajero_id: user.name || user.id 
        })
        .eq('id', id);

      if (error) throw error;
      addNotification("Chofer en camino", `Vas hacia ${sucursalName}.`, 'transit');
      
      // Notificar a la sucursal (Web lo hace así)
      await supabase.from("notificaciones").insert([{
        sucursal: sucursalName,
        title: "Recolector en Camino",
        message: `${user.name || 'El recolector'} ha aceptado tu pedido y se dirige a tu sucursal.`,
        type: "info",
        metadata: { sucursal: sucursalName }
      }]);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo aceptar la recolección");
    }
  };

  const handleConfirmPickup = async (id, sucursalName) => {
    try {
      const { error } = await supabase
        .from('logistica_envios')
        .update({ 
          status: 'En Tránsito', 
          hora_recoleccion: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
       addNotification("Muestras Recolectadas", `${sucursalName} en camino a Matriz.`, 'success');
       
       // Notificar a la sucursal
       await supabase.from("notificaciones").insert([{
         sucursal: sucursalName,
         title: "Paquete Recolectado",
         message: `Recolección exitosa, el recolector va hacia Matriz.`,
         type: "success",
         metadata: { sucursal: sucursalName }
       }]);

       Alert.alert("Éxito", "Muestras recolectadas correctamente. El estado ahora es 'En Tránsito'.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo confirmar la recogida");
    }
  };

  const fetchShipments = async () => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Traer envíos pendientes (sin hora de recolección aún)
      // Eliminamos el filtro de fecha estricto para no perder solicitudes de días anteriores aún pendientes
      const { data: envios, error: e1 } = await supabase
        .from('logistica_envios')
        .select('*')
        .is('hora_recoleccion', null)
        .order('created_at', { ascending: false });

      if (e1) throw e1;

      // Traer directorio de sucursales para los números
      const { data: dir, error: e2 } = await supabase
        .from('sucursales')
        .select('nombre, telefono');
      
      if (e2) throw e2;

      // Cruzar datos
      const map = {};
      dir?.forEach(d => { map[d.nombre] = d.telefono; });

      const finalData = (envios || []).map(item => ({
        ...item,
        telefono: map[item.sucursal] || null
      }));

      setShipments(finalData);

      // --- VIGILANCIA PROACTIVA ---
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60000);
      const urgentOnes = finalData.filter(s => 
        !s.mensajero_id && 
        new Date(s.created_at) < fifteenMinsAgo
      );
      
      if (urgentOnes.length > 0) {
        setUrgentCount(urgentOnes.length);
        addNotification("Atención", `Hay ${urgentOnes.length} solicitudes sin atender desde hace más de 15 min.`, 'warning');
      } else {
        setUrgentCount(0);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchShipments();

    const channel = supabase
      .channel('realtime_shipments')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'logistica_envios' }, 
        (payload) => {
          triggerLocalNotification(payload.new.sucursal);
          // Pequeño retraso para asegurar que la DB terminó de persistir antes de re-consultar
          setTimeout(() => fetchShipments(), 500); 
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'logistica_envios' }, 
        (payload) => {
          const { mensajero_id, sucursal, status } = payload.new;
          if (mensajero_id && mensajero_id !== (user.name || user.id) && status === 'En camino') {
            triggerAcceptanceAlert(mensajero_id, sucursal);
          }
          fetchShipments();
        }
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'logistica_envios' }, 
        () => {
          fetchShipments();
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: 'role=eq.mensajero' },
        (payload) => {
          const { user_id } = payload.new;
          // Solo agregar a la campanita si es para mí o es general (null)
          if (!user_id || user_id === user.id) {
            // skipSystem=true porque App.js ya dispara la notificación nativa para la tabla 'notificaciones'
            addNotification(payload.new.title, payload.new.message, payload.new.type || 'info', true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchShipments();
  };

  const renderItem = ({ item }) => {
    const isTakenByMe = item.mensajero_id === (user.name || user.id);
    const isTakenByOther = item.mensajero_id && !isTakenByMe;
    const isAvailable = !item.mensajero_id;
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60000);
    const isUrgent = isAvailable && new Date(item.created_at) < fifteenMinsAgo;

    return (
      <Animated.View 
        style={[
          styles.glassCard, 
          isTakenByOther && styles.cardTaken,
          isUrgent && styles.cardUrgent,
          isUrgent && { 
            borderColor: pulseAnim.interpolate({
              inputRange: [1, 1.1],
              outputRange: ['#FEE2E2', '#EF4444']
            }),
            borderWidth: 2,
            backgroundColor: pulseAnim.interpolate({
              inputRange: [1, 1.1],
              outputRange: ['#FFF5F5', '#FEF2F2']
            }),
          }
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[
            styles.iconBox, 
            isTakenByMe && {backgroundColor: '#ECFDF5'},
            isUrgent && {backgroundColor: '#FEF2F2'}
          ]}>
            <Package 
              size={24} 
              color={isUrgent ? '#EF4444' : (isTakenByMe ? '#10B981' : theme.colors.primary)} 
              strokeWidth={2.8} 
            />
          </View>
          <View style={[
            styles.badge, 
            item.status === 'En camino' && styles.badgeWarning,
            item.status === 'En Tránsito' && styles.badgeTransit,
            item.hora_recoleccion && styles.badgeSuccess,
            isUrgent && styles.badgeUrgent
          ]}>
            <Text style={[
              styles.badgeText,
              item.status === 'En camino' && styles.badgeTextWarning,
              item.status === 'En Tránsito' && styles.badgeTextTransit,
              item.hora_recoleccion && styles.badgeTextSuccess,
              isUrgent && styles.badgeTextUrgent
            ]}>
              {isUrgent ? 'CRÍTICO' : (isTakenByMe ? (item.status === 'En camino' ? 'VAS TÚ' : 'EN TRÁNSITO') : (item.status?.toUpperCase() || 'PENDIENTE'))}
            </Text>
            {isUrgent && <AlertTriangle size={12} color="#EF4444" style={{marginLeft: 4}} strokeWidth={3} />}
          </View>
        </View>
        
        <View style={styles.destinationBox}>
          <View style={styles.sucursalHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sucursalLabel}>ORIGEN</Text>
              <Text style={styles.sucursalValue}>{item.sucursal || 'Sin sucursal'}</Text>
            </View>
            
            {/* ACCIONES DE CONTACTO */}
            <View style={styles.contactActions}>
              <TouchableOpacity 
                style={[styles.contactCircle, !item.telefono && styles.contactDisabled]}
                onPress={() => item.telefono && Linking.openURL(`tel:${item.telefono}`)}
              >
                <Phone size={18} color={item.telefono ? '#3B82F6' : '#CBD5E1'} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.contactCircle, !item.telefono && styles.contactDisabled]}
                onPress={() => item.telefono && Linking.openURL(`whatsapp://send?phone=${item.telefono}&text=Hola, soy el recolector de Solcan Lab y voy en camino.`)}
              >
                <MessageCircle size={18} color={item.telefono ? '#10B981' : '#CBD5E1'} />
              </TouchableOpacity>
            </View>
          </View>
          
          {isTakenByOther && (
            <Text style={styles.takenInfo}>En camino por: {item.mensajero_id}</Text>
          )}

          <View style={styles.divider} />
          
          <View style={styles.row}>
            <MapPin size={16} color={theme.colors.textMuted} />
            <Text style={styles.destinationText}>Destino: Matriz Tuxtla</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {isAvailable ? (
            <SwipeToAccept 
              key={`accept-${item.id}`}
              onAccept={() => handleAcceptShipment(item.id, item.sucursal)} 
              label="Aceptar Viaje →"
              color="#3B82F6"
            />
          ) : isTakenByMe && item.status === 'En camino' ? (
            <SwipeToAccept 
              key={`confirm-${item.id}`}
              onAccept={() => handleConfirmPickup(item.id, item.sucursal)} 
              label="Confirmar Recogida →"
              activeLabel="¡RECOLECTADO!"
              color="#F59E0B"
            />
          ) : isTakenByMe && item.status === 'En Tránsito' ? (
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => onNavigate && onNavigate('bitacora')} 
            >
              <Text style={styles.actionBtnText}>Bitácora FO-DO-017</Text>
              <ChevronRight size={18} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[theme.colors.accent, '#5466F9', theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumHeader}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onOpenMenu} style={styles.iconButton}>
              <Menu size={28} color="#FFF" strokeWidth={2.8} />
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => setShowNotifMenu(true)}
              >
                <Bell size={28} color="#FFF" strokeWidth={2.5} />
                {notifCount > 0 && <View style={styles.notifBadge} />}
              </TouchableOpacity>
              
              <View style={styles.profileBox}>
                {user?.foto_url ? (
                  <Image source={{ uri: user.foto_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User size={20} color="#FFF" />
                  </View>
                )}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={shipments}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={theme.colors.secondary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Package size={32} color={theme.colors.secondary} />
              </View>
              <Text style={styles.greetingTitle}>¡Hola, {user?.name || 'Compañero'}!</Text>
              <Text style={styles.emptyText}>¿Listo para las recolecciones del día de hoy?</Text>
            </View>
          }
        />
      )}
      {/* --- MENU DE NOTIFICACIONES (CRYSTAL STYLE) --- */}
      <Modal
        visible={showNotifMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotifMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowNotifMenu(false)}
        >
          <View style={styles.notifContainer}>
            <View style={styles.notifHeader}>
              <View>
                <Text style={styles.notifTitle}>Notificaciones</Text>
                <Text style={styles.notifSubtitle}>{notifications.length} mensajes hoy</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowNotifMenu(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.notifList}
              showsVerticalScrollIndicator={false}
            >
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <View key={notif.id} style={styles.notifItem}>
                    <View style={[
                      styles.notifIcon, 
                      { 
                        backgroundColor: 
                          notif.type === 'success' ? '#ECFDF5' : 
                          notif.type === 'pickup' ? '#EFF6FF' :
                          notif.type === 'transit' ? '#EEF2FF' :
                          notif.type === 'taken' ? '#FFFBEB' : 
                          notif.type === 'warning' ? '#FACC15' : '#F1F5F9'
                      }
                    ]}>
                      {notif.type === 'success' ? (
                        <CheckCircle size={18} color="#10B981" />
                      ) : notif.type === 'pickup' ? (
                        <MapPin size={18} color="#3B82F6" />
                      ) : notif.type === 'transit' ? (
                        <Truck size={18} color="#6366F1" />
                      ) : notif.type === 'taken' ? (
                        <Package size={18} color="#F59E0B" />
                      ) : notif.type === 'warning' ? (
                        <AlertTriangle size={18} color="#000" />
                      ) : (
                        <Info size={18} color="#64748B" />
                      )}
                    </View>
                    <View style={styles.notifContent}>
                      <View style={styles.notifTopRow}>
                        <Text style={styles.notifItemTitle}>{notif.title}</Text>
                        <Text style={styles.notifTime}>{notif.time}</Text>
                      </View>
                      <Text style={styles.notifMessage}>{notif.message}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyNotifs}>
                  <Bell size={40} color={theme.colors.border} />
                  <Text style={styles.emptyNotifText}>No hay novedades por ahora</Text>
                </View>
              )}
            </ScrollView>

            {notifications.length > 0 && (
              <TouchableOpacity 
                style={styles.clearBtn}
                onPress={() => {
                  setNotifications([]);
                  setNotifCount(0);
                }}
              >
                <Text style={styles.clearBtnText}>Limpiar todo</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  premiumHeader: {
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  notifBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  profileBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerStats: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  statsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  glassCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  cardTaken: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeWarning: {
    backgroundColor: '#FFFBEB',
  },
  badgeSuccess: {
    backgroundColor: '#ECFDF5',
  },
  badgeText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextWarning: {
    color: '#D97706',
  },
  badgeTextSuccess: {
    color: '#10B981',
  },
  badgeTransit: {
    backgroundColor: '#EEF2FF',
  },
  badgeTextTransit: {
    color: '#6366F1',
  },
  destinationBox: {
    marginBottom: 20,
  },
  sucursalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  sucursalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  takenInfo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  sucursalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  contactDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#F1F5F9',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destinationText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginLeft: 6,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 4,
    fontWeight: '600',
  },
  acceptBtn: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  acceptBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  actionBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  swipeTrack: {
    backgroundColor: '#F1F5F9',
    height: 52,
    borderRadius: 26,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  swipeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    paddingLeft: 40, // Espacio para que el handle no tape el inicio del texto
  },
  swipeHandle: {
    position: 'absolute',
    left: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  
  // --- NOTIFICATION MENU STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
  },
  notifContainer: {
    width: Dimensions.get('window').width - 40,
    maxHeight: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  notifTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  notifSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifList: {
    marginBottom: 10,
  },
  notifItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  notifMessage: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  emptyNotifs: {
    alignItems: 'center',
    paddingVertical: 40,
    opacity: 0.6,
  },
  emptyNotifText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  clearBtn: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  cardUrgent: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
    borderWidth: 2,
  },
  badgeUrgent: {
    backgroundColor: '#FEF2F2',
  },
  badgeTextUrgent: {
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
});

