import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';
import { Eye, EyeOff, CheckCircle2, Circle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Cargar credenciales guardadas al iniciar
  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const savedUser = await SecureStore.getItemAsync('solcan_username');
      const savedPin = await SecureStore.getItemAsync('solcan_pin');
      const savedRemember = await SecureStore.getItemAsync('solcan_remember');

      if (savedRemember === 'true') {
        if (savedUser) setUsername(savedUser);
        if (savedPin) setPin(savedPin);
        setRememberMe(true);
      }
    } catch (e) {
      console.log("Error loading credentials", e);
    }
  };

  const handleLogin = async () => {
    if (!username || !pin) {
      Alert.alert('Error', 'Por favor ingresa tu usuario y PIN');
      return;
    }

    setLoading(true);
    const result = await login(username.trim(), pin.trim());
    
    if (result.success) {
      try {
        if (rememberMe) {
          await SecureStore.setItemAsync('solcan_username', username.trim());
          await SecureStore.setItemAsync('solcan_pin', pin.trim());
          await SecureStore.setItemAsync('solcan_remember', 'true');
        } else {
          await SecureStore.deleteItemAsync('solcan_username');
          await SecureStore.deleteItemAsync('solcan_pin');
          await SecureStore.setItemAsync('solcan_remember', 'false');
        }
      } catch (e) {
        console.log("Error saving credentials", e);
      }
    } else {
      Alert.alert('Acceso Denegado', result.message);
    }
    setLoading(false);
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>SOLCAN LAB</Text>
            <View style={styles.mobileBadge}>
              <Text style={styles.mobileBadgeText}>MOBILE</Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Usuario</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre de usuario"
                placeholderTextColor="#94A3B8"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PIN de Seguridad</Text>
              <View style={styles.pinContainer}>
                <TextInput
                  style={styles.pinInput}
                  placeholder="Tu PIN"
                  placeholderTextColor="#94A3B8"
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="numeric"
                  secureTextEntry={!showPin}
                />
                <TouchableOpacity 
                  onPress={() => setShowPin(!showPin)}
                  style={styles.eyeBtn}
                >
                  {showPin ? (
                    <EyeOff size={20} color={theme.colors.textMuted} />
                  ) : (
                    <Eye size={20} color={theme.colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              {rememberMe ? (
                <CheckCircle2 size={20} color="#3B82F6" />
              ) : (
                <Circle size={20} color="#475569" />
              )}
              <Text style={[styles.rememberText, rememberMe && styles.rememberTextActive]}>
                Recordar datos en este dispositivo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Entrar al Sistema</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.footer}>Versión 1.1 - Secure Access System</Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  logo: {
    width: 65,
    height: 65,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  mobileBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  mobileBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pinInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeBtn: {
    padding: 16,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
  },
  rememberText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  rememberTextActive: {
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    color: 'rgba(148, 163, 184, 0.5)',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 12,
    fontWeight: '500',
  }
});
