# Solcan Mobile - Bitácora de Desarrollo y Despliegue (Abril 2026)

Este documento resume las intervenciones técnicas, correcciones de errores e integraciones de hardware realizadas en la plataforma móvil de Solcan Lab para asegurar una operación logística robusta y profesional.

## 1. Correcciones de Bugs Críticos

### Sincronización de Datos y Mapeo en Bitácora (FO-DO-017)
- **Corrección de Columnas**: Se detectó que el generador de PDF intentaba leer la columna `s_orina`, la cual no existía en el esquema de Supabase. Se asignó correctamente a la columna `s_papel`.
- **Inconsistencia de Formatos**: Se estandarizó el uso de `f_qc_020` (integer) en lugar de `f_gc_020` (boolean) tanto en la interfaz visual como en el reporte PDF para mantener la integridad de los conteos de formatos entregados.
- **Error de Zona Horaria (UTC vs Local)**: Se reemplazó el uso de `toISOString()` por una función de fecha local (`getLocalDate`) en la carga inicial de la bitácora, evitando que los choferes vean la bitácora vacía después de las 6:00 PM debido al desfase de UTC.

### Duplicidad de Notificaciones
- **Optimización de Listeners**: Se resolvió un conflicto donde tanto el wrapper global (`App.js`) como el dashboard (`CourierDashboard.js`) disparaban alertas sonoras para el mismo evento.
- **Solución**: Se implementó una lógica de `skipSystem` en los componentes internos para que la alerta sonora/vibración del sistema sea gestionada centralmente, evitando así que el teléfono suene dos veces por el mismo mensaje.

---

## 2. Infraestructura y Servicios Externos

Para lograr que la aplicación responda en milisegundos y vibre de forma nativa, se configuró un ecosistema de tres capas:

### Capa 1: Firebase Cloud Messaging (FCM) y Google Services
- **Configuración**: Se integró el archivo `google-services.json` en la raíz del proyecto y se vinculó en `app.json`.
- **Propósito**: Permitir que Android reciba mensajes de datos incluso cuando la aplicación está cerrada o en segundo plano.
- **Canales de Notificación**: Se configuró un canal `default` con importancia `MAX` en Android para garantizar que se rompa el silencio del sistema.

### Capa 2: Pasarela en Tiempo Real (Supabase Realtime)
- **El "Bypass"**: En lugar de depender únicamente de notificaciones push tradicionales (que a veces tardan), usamos **Supabase Realtime** (`postgres_changes`).
- **Funcionamiento**: La app mantiene una conexión persistente. En cuanto hay un `INSERT` en la tabla `notificaciones` o `logistica_envios`, Supabase le avisa a la app y esta dispara una **Notificación Local** inmediata con sonido y vibración. Esto garantiza latencia cero.

### Capa 3: Gestión de Tokens (Push Subscriptions)
- **Registro**: Al iniciar sesión, la app obtiene un token único del dispositivo (`ExponentPushToken`) y lo guarda en la tabla `push_subscriptions` vinculándolo al `user_id`.
- **Escudo de Redundancia**: Implementamos una lógica en `lib/notifications.js` que usa `SecureStore` para guardar el último token registrado y evitar peticiones innecesarias a la base de datos cada vez que abres la app.

---

## 3. Integración de Hardware y Feedback Háptico

Se implementó una experiencia nativa premium mediante vibración física (Haptic Feedback) para mejorar la atención del repartidor en campo:

- **Módulo Nativo**: Uso de `Vibration` de `react-native`.
- **Patrón de Alerta Crítica**: `[0, 500, 200, 500]` (Vibración doble y larga). Se dispara automáticamente al detectar nuevas solicitudes de recolección o notificaciones de administración.
- **Feedback en Dashboard**: Vibraciones cortas al aceptar o confirmar una recolección para confirmar la acción táctil.

---

## 4. Flujo de Trabajo y Despliegue (EAS Build)

La aplicación utiliza **EAS (Expo Application Services)** para generar binarios de producción.

### Perfiles de Compilación (`eas.json`)
Se configuraron perfiles específicos para facilitar la distribución directa:
- **`apk`**: Genera un archivo `.apk` autónomo ideal para instalación directa (sideloading) en los dispositivos de los choferes sin pasar por Google Play Store.
- **`production`**: Genera un formato `app-bundle` (.aab) listo para subir a la tienda en el futuro.

### Comandos de Compilación en Windows
Debido a configuraciones de variables de entorno comunes en Windows, se estandarizó el uso de `npx` para garantizar la ejecución:
1. `npx eas-cli login`
2. `npx eas-cli build -p android --profile apk`

---

## 5. Notas para Futuras Programaciones

- **Identidad de Mensajero**: Actualmente se utiliza `user.name` como identificador primario en la columna `mensajero_id` para mantener compatibilidad con reportes legibles por humanos en la base de datos.
- **Filtros de Dashboard**: Se eliminó la restricción de "Solo por Hoy" en el dashboard de recolecciones. Ahora muestra **todo lo pendiente** (`hora_recoleccion IS NULL`) para evitar perder solicitudes que quedaron abiertas durante la noche.
- **Actualizaciones invisibles (OTA)**: Para cambios de código menores, se recomienda usar `npx eas update` en lugar de generar un APK nuevo. Solo es obligatorio un nuevo APK si se cambian iconos, nombres o librerías nativas.
