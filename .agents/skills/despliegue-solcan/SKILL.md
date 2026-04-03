---
name: despliegue-solcan
description: Workflow estándar para subir y desplegar cambios en Solcan.
---

# 🚀 Skill de Despliegue Solcan (Desarrollo -> Main)

Esta skill documenta y automatiza el proceso de despliegue oficial de la plataforma Solcan, asegurando que los cambios pasen por la rama de desarrollo antes de llegar a producción.

## 🛠️ Procedimiento de Operación

Siempre que el usuario solicite "desplegar", "subir cambios" o "actualizar main", debes seguir estos pasos EXACTAMENTE en orden:

### Paso 1: Preparación y Commit en Desarrollo
Asegúrate de estar en `desarrollo` y de incluir todos los archivos nuevos o modificados.

// turbo
```bash
git checkout desarrollo
git add .
git commit -m "Descripción técnica concisa de los cambios"
git push origin desarrollo
```

### Paso 2: Integración a Main (Producción)
Cambia a la rama principal, actualízala y fusiona los cambios probados.

// turbo
```bash
git checkout main
git pull origin main
git merge desarrollo --no-edit
git push origin main
```

### Paso 3: Retorno a Desarrollo
Regresa siempre a la rama de trabajo para evitar commits accidentales en main.

// turbo
```bash
git checkout desarrollo
```

## 📊 Reglas de Oro
1.  **Sin Interacción**: Siempre utiliza `--no-edit` en el merge para evitar bloqueos por editores de texto.
2.  **Mensajes de Commit**: Deben ser profesionales y describir los módulos afectados (ej: "Ajuste RLS en storage" o "Refactor Navbar").
3.  **Ambiente**: Asegúrate de que el servidor de desarrollo (`npm run dev`) siga corriendo o sea reiniciado si es necesario.
