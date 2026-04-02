---
name: logistica-formato-bitacora
description: Estándar visual de la Bitácora Logística FO-DO-017 (Solcan)
---

# Skill: Formato de Bitácora Logística (FO-DO-017)

Este documento define el estándar visual intocable para el módulo de Bitácora Logística de Solcan. Cualquier edición futura debe respetar estas reglas para mantener la fidelidad con el formato oficial impreso.

## 1. Estructura de Encabezados (CSS)

Los encabezados verticales de la tabla (`.verticalTh`) DEBEN tener la siguiente rotación y estilo:
- **Writing Mode**: `vertical-rl`
- **Rotation**: `0deg` (lectura de arriba hacia abajo, caracteres rotados 90° CW automáticamente por el modo de escritura).
- **Dimensiones**: Altura fija de `100px`, ancho mínimo de `18px`.
- **Fuente**: `0.55rem` con `line-height: 1`.

```css
.verticalTh {
  writing-mode: vertical-rl;
  transform: rotate(0deg);
  white-space: nowrap !important;
  padding: 4px 1px !important;
  vertical-align: middle !important;
  text-align: center !important;
  height: 100px !important;
  font-size: 0.55rem !important;
  line-height: 1 !important;
  min-width: 20px !important;
  border: 1px solid #000 !important;
}
```

## 2. Diagonales de Cancelación

Las diagonales de celdas vacías (`.diagonalLine`) se implementan mediante un gradiente lineal fino de 1px:
- **Ángulo**: `to bottom right` (\)
- **Color**: Negro sólido (#000)
- **Posición**: Centrado al 50% con stops nítidos.

```css
.diagonalLine {
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom right, transparent 49.5%, #000 49.5%, #000 50.5%, transparent 50.5%);
}
```

## 3. Exportación a Excel

Se utiliza la librería `exceljs` con descarga directa vía ancla nativa para evitar nombres UUID.

- **Nombre de archivo**: `Reporte_Bitacora_YYYY-MM-DD.xlsx`
- **Mime Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

```javascript
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.setAttribute('download', fileName);
document.body.appendChild(link);
link.click();
```

## 4. Áreas Técnicas

El mapeo de áreas es dinámico (`AREAS` constant) y cada área debe generar dos sub-columnas verticales: "Usuario" y "Horario".

---
> [!IMPORTANT]
> Nunca revertir los encabezados a formato horizontal por comodidad de pantalla, ya que esto rompe la estructura del formato FO-DO-017 de Solcan.
