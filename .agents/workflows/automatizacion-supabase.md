---
description: Cómo ejecutar cambios de estructura en Supabase (Tablas/Columnas) de forma automática usando el RPC Master Key.
---

# 🤖 Automatización Suprema de Supabase

Este workflow documenta cómo realizar cambios de arquitectura (SQL DDL) a través del cliente de JS sin usar el Panel de Control.

## 🛠️ Paso 1: Verificación de la Llave Maestra
Asegurarse de que la función RPC `exec_sql` esté activa en la base de datos de Solcan.

## 📝 Paso 2: Preparación del Comando
Crear el código SQL que se desea ejecutar. Siempre usar `IF NOT EXISTS` para mayor portabilidad.

## 🛠️ Paso 3: Lanzamiento desde el Agente
Utilizar un script de Node similar a este:

// turbo
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(URL, SERVICE_ROLE_KEY);

await supabase.rpc('exec_sql', {
  query_text: 'ALTER TABLE logistica_envios ADD COLUMN IF NOT EXISTS nueva_col INT DEFAULT 0;'
});
```

## 📊 Paso 4: Auditoría
Verificar que el cambio se refleje en la tabla `auditoria_ejecucion`.

// turbo-all
---
**Nota para el Agente:** Siempre que necesites añadir columnas del FO-DO-017 o realizar migraciones de datos, consulta este workflow.
