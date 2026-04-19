# Estándar de Adaptación Responsiva - Plataforma Solcan

Este documento describe el patrón de diseño utilizado para convertir interfaces complejas de escritorio (como tablas de inventario) en experiencias móviles sostenibles y eficientes.

## 1. El Patrón "Card-Template" (Móvil vs Escritorio)

En lugar de intentar forzar una tabla con muchas columnas en una pantalla estrecha, utilizamos un enfoque híbrido:

### Escritorio (Tablet/PC)
*   **Visualización:** Tabla densa (`styles.denseTable`).
*   **Objetivo:** Máxima densidad de información y análisis rápido.
*   **Implementación:** Se envuelve en una clase `.desktopView` que se oculta en móviles.

### Móvil (Smartphones < 768px)
*   **Visualización:** Lista de Tarjetas (`styles.mobileView` + `MaterialCard`).
*   **Objetivo:** Lectura vertical, navegación táctil y eliminación del scroll horizontal.
*   **Implementación:** Se activa mediante media queries, reorganizando los datos en una cuadrícula de 1 o 2 columnas según el ancho.

---

## 2. Anatomía de una Tarjeta Mobile-First

Para que las tarjetas funcionen bien, deben seguir esta estructura:

1.  **Header (Cabecera):**
    *   **Prefijo/Código:** En fuente monoespaciada pequeña.
    *   **Título:** Nombre principal del ítem con peso 800/900.
    *   **Badge:** Indicador visual de estatus en la esquina derecha superior.
2.  **Body (Cuerpo):**
    *   **Info Grid:** Una cuadrícula de 2 columnas (para iPad) que colapsa a 1 columna (para móviles < 480px) usando `grid-template-columns: 1fr`.
    *   **Etiquetas:** Nombres de campo en mayúsculas pequeñas (0.65rem) con colores neutros.
3.  **Details (Desplegable):**
    *   Información secundaria (como lotes o números de serie) que se carga bajo demanda para no saturar la vista inicial.

---

## 3. Implementación CSS Base (Snippet)

```css
/* Contenedor principal para evitar desbordamientos laterales */
.container {
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

/* Control de vistas */
.mobileView { display: none; }
.desktopView { display: block; }

@media (max-width: 768px) {
  .desktopView { display: none; }
  .mobileView { display: flex; flex-direction: column; gap: 1rem; }
  
  .container { padding: 1rem 0.5rem; }
}

/* Grid adaptable para tarjetas */
.cardInfoGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 480px) {
  .cardInfoGrid { grid-template-columns: 1fr; }
}
```

---

## 4. Reglas de Oro para Solcan Mobile

1.  **Cero Fixed Widths:** Nunca usar `width: 300px` en elementos de búsqueda o filtros; usar `width: 100%` con `max-width` si es necesario.
2.  **Touch Targets:** Los botones de escaneo o acciones deben tener un área táctil mínima de 40x40px.
3.  **Hiding Redundancy:** Ocultar elementos de la barra de navegación que ya existen dentro del menú hamburguesa para maximizar el espacio de la marca.
4.  **No Horizontal Scroll:** El scroll horizontal está prohibido en el cuerpo de la página. Solo se permite en selectores de categorías (pills) y debe ser indicado visualmente.

---
*Documentación generada el 19 de Abril de 2026 para el equipo de desarrollo de Solcan Lab.*
