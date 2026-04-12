import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Package, ClipboardList, LogOut, X, User, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function Sidebar({ isOpen, onClose, onNavigate, user, logout }) {
  const { updateAvatar } = useAuth();
  const [slideAnim] = React.useState(new Animated.Value(-width));
  const [isRendered, setIsRendered] = React.useState(isOpen);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true, // Esto permite el RECORTE que pidió el usuario
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir la galería');
    }
  };

  const uploadImage = async (uri) => {
    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}.jpg`;
      
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateAvatar(publicUrl);
      Alert.alert('Éxito', 'Foto de perfil actualizada');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsRendered(false));
    }
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <SafeAreaView style={styles.content}>
          <View style={styles.drawerHeader}>
            <View style={styles.userInfo}>
              <TouchableOpacity 
                style={styles.avatarContainer} 
                onPress={pickImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFF" />
                ) : user?.foto_url ? (
                  <Image source={{ uri: user.foto_url }} style={styles.avatarImg} />
                ) : (
                  <User size={24} color="#FFF" />
                )}
                <View style={styles.cameraBadge}>
                  <Camera size={12} color="#FFF" />
                </View>
              </TouchableOpacity>
              <View>
                <Text style={styles.userName}>{user?.name}</Text>
                <Text style={styles.userRole}>Recolector Logística</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.menuItems}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { onNavigate('dashboard'); onClose(); }}
            >
              <Package size={22} color={theme.colors.secondary} />
              <Text style={styles.menuText}>Recolecciones Pendientes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { onNavigate('bitacora'); onClose(); }}
            >
              <ClipboardList size={22} color={theme.colors.secondary} />
              <Text style={styles.menuText}>Bitácora FO-DO-017</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <LogOut size={20} color={theme.colors.danger} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    width: width * 0.75,
    backgroundColor: '#FFF',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  content: { flex: 1, padding: 24 },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    position: 'relative'
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: theme.colors.secondary,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  userRole: { fontSize: 12, color: theme.colors.textMuted },
  menuItems: { flex: 1 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuText: {
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.danger,
  }
});
