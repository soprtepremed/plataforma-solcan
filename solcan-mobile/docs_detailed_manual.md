# Solcan Mobile: Manual Técnico de Arquitectura e Implementación (Edición Abril 2026)

Este documento es una guía exhaustiva diseñada para desarrolladores senior que necesiten mantener, escalar o replicar la infraestructura de la aplicación móvil de **Solcan Lab**. Cubre desde la lógica de bajo nivel hasta las integraciones de nube.

---

## 1. Arquitectura del Sistema
La aplicación está construida sobre **React Native + Expo**, utilizando una arquitectura basada en **Contextos** para el manejo de estado global y **Hooks** para la lógica de componentes.

### Stack Tecnológico:
- **Core**: React Native (Expo) - Seleccionado por su capacidad de actualizaciones OTA.
- **Base de Datos y Auth**: Supabase (PostgreSQL + GoTrue).
- **Notificaciones**: Firebase Cloud Messaging (FCM) + Expo Notifications.
- **Feedback Háptico**: Native Vibration API.
- **Generación de Reportes**: Expo Print (HTML to PDF engine).
- **Almacenamiento Seguro**: Expo SecureStore (Cifrado de credenciales y tokens).

---

## 2. Gestión de Identidad y Seguridad (AuthContext)
### Protocolo de Autenticación y Autorización (RBAC)
- **Middleware de Perfil**: Al iniciar sesión con (Usuario + PIN), la app valida las credenciales y aplica una **Restricción de Rol**. 
- **Regla de Acceso**: Solo se permite la entrada a usuarios con el rol exacto de `mensajero`. Si un usuario con otro rol (ej. `quimico`, `admin`) intenta entrar, el sistema disparará un mensaje de: *"Acceso denegado: Esta aplicación es exclusiva para el personal de Logística"*.
- **Persistencia**: Se utiliza `SecureStore` para guardar el nombre de usuario y el PIN si el usuario activa "Recordarme", permitiendo un inicio de sesión rápido sin re-ingresar datos.

---

## 3. Sistema de Notificaciones de "Vigilancia Proactiva"
Este es el motor de la aplicación y se divide en tres subsistemas:

### A. Capa de Notificaciones Push (Firebase/Google)
- **Configuración**: Implementada vía `google-services.json`. Vincula la app con la consola de Firebase.
- **Protocolo de Registro**: En `lib/notifications.js`, se implementó una función robusta que:
    1. Solicita permisos al SO.
    2. Crea el canal de importancia máxima (`AndroidImportance.MAX`).
    3. Obtiene el `ExpoPushToken`.
    4. Realiza un `upsert` en la tabla `push_subscriptions` de Supabase para tener mapeado qué token pertenece a qué chofer.

### B. Capa de Tiempo Real (Bypass de Latencia)
En `App.js`, se configuró un listener de PostgreSQL (`supabase.channel`).
- **Lógica**: Escucha inserciones en la tabla `notificaciones`.
- **Filtro de Rol**: Solo actúa si el registro tiene `role = 'mensajero'` o si es un mensaje directo para el `user_id` del equipo actual.
- **Acción**: Dispara una notificación local inmediata, asegurando que el chofer reciba la alerta incluso antes de que el servidor de Firebase termine de procesar el push.

### C. Integración de Hardware (Vibración)
Se configuró una experiencia táctil diferenciada:
- **Solicitud Urgente**: Patrón `[0, 500, 200, 500]` (vibración doble, insistente).
- **Confirmación de Acción**: Vibración corta de `250ms` para acciones exitosas (aceptar viaje, confirmar recogida).

---

## 4. Módulos Operativos: Análisis Lógico

### A. Courier Dashboard (Tablero de Control)
- **Filtro de Visibilidad Proactiva**: Se eliminó el filtro de fecha actual para las solicitudes pendientes. La lógica actual es: "Si no tiene `hora_recoleccion`, es tarea del chofer", sin importar si la solicitud se creó hoy o ayer.
- **Acciones de Swipe**: Se implementó el componente personalizado `SwipeToAccept` para evitar clics accidentales en el bolsillo del chofer. Requiere un deslizamiento consciente para aceptar o confirmar.
- **Vigilancia de Urgencia**: Una función interna calcula si una solicitud lleva más de 15 minutos sin ser tomada y activa una animación de pulso rojo (`pulseAnim`) en la tarjeta.

### B. Bitácora Móvil (FO-DO-017)
- **Mapeo de Datos Crucial**:
  - `s_papel` -> Mapeado visualmente como **ORINA**.
  - `f_qc_020` -> Mapeado como el formato **GC-020**.
- **Generador de Reportes**: Utiliza un template HTML inyectado dinámicamente. Se optimizó para tamaño **A3 Landscape** con el fin de que las ~30 columnas necesarias sean legibles.
- **Corrección de Timezone**: Se implementó `getLocalDate()` para forzar el uso del calendario del teléfono y no el de UTC, evitando desfases de fecha en operaciones nocturnas.

---

## 5. Proceso de Despliegue (EAS Build)

### Configuración de `eas.json`
Se separaron los perfiles para mayor control:
- **`development`**: Para pruebas con el cable USB y logs en tiempo real.
- **`apk`**: Perfil de producción optimizado que genera un binario instalable directamente. Incluye `autoIncrement: true` para que cada compilación tenga un `versionCode` superior automáticamente.

### Comandos de Ejecución en Windows (PowerShell)
Para mitigar problemas de PATH en Windows:
- Se utiliza el prefijo `npx eas-cli` para asegurar que se use la versión local/cacheada del compilador.
- **Flujo**: `eas login` -> `eas build -p android --profile apk`.

---

## 6. Comportamiento ante Desconexión y Resiliencia
Un aspecto crítico para Solcan Lab es la operación en zonas con baja cobertura (sótanos de hospitales o carreteras).

### A. Persistencia de Notificaciones (Cloud Buffer)
- **Firebase Store-and-Forward**: Si el dispositivo pierde conexión, el servidor de FCM mantiene los mensajes en cola. En cuanto el sistema de radio del teléfono detecta el regreso de datos (handshake), Google entrega los mensajes pendientes de forma prioritaria.
  
### B. Reconexión de Sockets (Realtime Recovery)
- El SDK de Supabase implementa una estrategia de **Exponential Backoff**. Si el socket se rompe, intentará reconectarse en intervalos de tiempo crecientes hasta restablecer el canal de "Vigilancia Proactiva".

### C. Hoja de Ruta para Resiliencia Total (Futuro)
Para evolucionar a un modelo **"Offline-First"**, se recomienda:
1. **Local State Sync**: Implementar `AsyncStorage` o `SQLite` para cachear la lista de envíos.
2. **Queue de Mutaciones**: Guardar las "Confirmaciones de Recogida" en una cola local si el `HttpStatus` es 0 o falla el fetch, y reintentar automáticamente al detectar conexión.
3. **NetInfo Integration**: Inyectar un banner visual que avise al chofer: *"Operando en modo sin conexión - Los cambios se sincronizarán al recuperar señal"*.

---

## 7. Mantenimiento de Base de Datos (Supabase)
Tablas clave involucradas:
- `logistica_envios`: Almacena el estado de la cadena de custodia.
- `notificaciones`: Origen de las alertas en tiempo real.
- `empleados`: Perfiles y seguridad (PIN).
- `push_subscriptions`: Mapa de dispositivos activos.
