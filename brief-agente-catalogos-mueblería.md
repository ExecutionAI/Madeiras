# Brief: Sistema de Búsqueda, Comparación y Cotización de Catálogos para Vendedores de Mueblería

## 1. Contexto y problema a resolver

La mueblería trabaja con múltiples proveedores externos (Coaster, Happy Homes, Home Elegance, ChromeMart, Furnitures, entre otros — se estiman entre 8 y 9 catálogos activos), cada uno accesible mediante una plataforma web propia con usuario y contraseña independientes.

Hoy, cuando un cliente llega a piso y muestra interés en un mueble (por ejemplo, un sofá seccional en un color y presupuesto específicos), el vendedor debe:

1. Entrar manualmente a cada plataforma de catálogo.
2. Buscar el producto o algo similar en cada una.
3. Comparar precios, disponibilidad, colores y variantes entre proveedores.
4. Calcular manualmente el precio de venta (costo + margen).
5. Presentar opciones al cliente.

Este proceso puede tomar 40 minutos a 1 hora por cliente, generando fricción, pérdida de interés del cliente en piso, y riesgo de errores en el cálculo de márgenes o en pasar por alto mejores opciones de precio/disponibilidad entre proveedores.

**Problema central:** No existe una forma unificada y rápida de consultar múltiples catálogos de proveedores, compararlos, aplicar reglas de margen del negocio, y generar una cotización lista para el cliente, todo en el momento de la interacción en piso.

## 2. El tema de los catálogos

### 2.1 Naturaleza de los datos
- Cada proveedor (Coaster, Happy Homes, Home Elegance, ChromeMart, Furnitures, etc.) mantiene su propio catálogo en su propia plataforma.
- Acceso actual: usuario y contraseña por plataforma, navegación web estándar.
- **Existe la posibilidad de exportar reportes** (ej. Excel/CSV) desde al menos algunas de estas plataformas — esta es la vía de integración más limpia y de menor riesgo técnico/legal.
- Alternativa (a evaluar con más cuidado): automatización de acceso directo a las plataformas con credenciales existentes, para consulta en vivo o scraping periódico.
- Cada catálogo probablemente tiene su propio formato de datos: nombres de campos distintos, unidades, estructura de variantes (color, tela, tamaño), disponibilidad, fotos, SKUs, precios de costo.

### 2.2 Retos a anticipar
- Normalización: unificar productos de distintos proveedores en un modelo de datos común (categoría, subcategoría, color, material/tela, dimensiones, precio costo, disponibilidad, foto, proveedor origen).
- Frecuencia de actualización: los catálogos cambian (precios, inventario, descontinuados) — se necesita definir una cadencia de sincronización (diaria, semanal, on-demand).
- Manejo de imágenes/fotos de producto.
- Posibles duplicados o productos equivalentes entre proveedores (mismo mueble, distinto proveedor).

## 3. Casos de uso del vendedor

### Caso de uso 1: Búsqueda rápida por criterio de cliente
El vendedor está en piso con un cliente frente a un mueble de interés. Ingresa criterios como tipo de mueble, color, presupuesto aproximado, y obtiene en segundos opciones equivalentes disponibles entre todos los proveedores, ya con precio de venta calculado (no solo costo).

### Caso de uso 2: Comparación de variantes de un producto específico
El cliente pregunta "¿lo tienes en gris?" o "¿hay una versión más chica o más económica?". El vendedor consulta variantes del mismo producto o productos similares entre proveedores sin tener que revisar cada plataforma por separado.

### Caso de uso 3: Cotización instantánea
Una vez elegido el producto, el vendedor genera una cotización con el precio final (costo + margen del negocio, ej. 65%), lista para mostrar o compartir con el cliente.

### Caso de uso 4: Consulta de disponibilidad/inventario
El vendedor confirma si el producto está disponible actualmente en el proveedor correspondiente antes de comprometerse con el cliente.

*(Nota: estos casos de uso están descritos a nivel de necesidad del vendedor; el "cómo" — si es conversacional, con filtros, por voz, etc. — queda abierto para definir en la fase de diseño de solución.)*

## 4. Beneficios esperados

**Para el negocio:**
- Reducción del tiempo de atención al cliente en piso (de ~40-60 min a minutos).
- Mayor probabilidad de cierre de venta al reducir la fricción y espera.
- Consistencia y control en la aplicación del margen de ganancia (65% u otro definido) — elimina errores de cálculo manual.
- Visibilidad centralizada del catálogo completo de proveedores en un solo lugar.
- Mejor capacidad de comparar y elegir la opción más rentable o disponible entre proveedores para un mismo tipo de producto.

**Para el vendedor:**
- Herramienta de apoyo en tiempo real durante la venta, sin necesidad de conocimiento profundo de cada plataforma de proveedor.
- Menos tiempo operativo/administrativo, más tiempo enfocado en la relación con el cliente.

**Para el cliente (indirecto):**
- Atención más ágil y opciones más completas en menos tiempo.

## 5. Arquitectura de alto nivel (conceptual, sin comprometerse a una implementación específica)

La solución se puede pensar como un conjunto de módulos desacoplados, cada uno resolviendo una responsabilidad concreta. Esto permite construir por fases y decidir después qué tan automatizado o "inteligente" es cada uno.

### Módulo 1 — Extracción / Ingesta de catálogos
Responsable de traer la información de cada proveedor hacia el sistema propio.
- Fuente de datos: reportes exportados (CSV/Excel) como primera vía; automatización de acceso a plataformas como vía futura.
- Define frecuencia de actualización y proceso de carga.
- Salida: datos crudos por proveedor, sin normalizar todavía.

### Módulo 2 — Normalización y modelo de datos unificado
Responsable de transformar los datos crudos de cada proveedor en un modelo común.
- Define un esquema estándar: categoría, tipo de mueble, color, material, dimensiones, precio costo, disponibilidad, foto, proveedor, SKU origen.
- Resuelve equivalencias/duplicados entre proveedores cuando aplique.

### Módulo 3 — Consulta de inventario / catálogo unificado
Responsable de permitir búsquedas y filtros sobre los datos ya normalizados.
- Búsqueda por tipo, color, material, rango de precio, disponibilidad.
- Comparación entre proveedores para un mismo criterio.

### Módulo 4 — Motor de cotización / pricing
Responsable de aplicar las reglas de negocio sobre el costo.
- Aplica margen (ej. 65%) u otras reglas (descuentos, redondeos, mínimos).
- Calcula precio final de venta y ganancia esperada por unidad.

### Módulo 5 — Interfaz del vendedor
Responsable de la interacción del vendedor con el sistema.
- Punto de entrada donde el vendedor ingresa criterios y recibe resultados/cotización.
- Formato de interacción (conversacional, formulario, dashboard, etc.) queda abierto a definir.

### Módulo 6 — Gestión de imágenes/fotos de producto
Responsable de asociar y mostrar fotos de cada producto junto a sus resultados.

### Relación entre módulos (flujo conceptual)
```
Proveedores (Coaster, Happy Homes, Home Elegance, etc.)
        │
        ▼
[Módulo 1: Extracción/Ingesta]
        │
        ▼
[Módulo 2: Normalización / Modelo de datos unificado]
        │
        ▼
[Módulo 3: Consulta de inventario] ──▶ [Módulo 6: Imágenes]
        │
        ▼
[Módulo 4: Motor de cotización]
        │
        ▼
[Módulo 5: Interfaz del vendedor] ──▶ Vendedor / Cliente en piso
```

## 6. Preguntas abiertas / decisiones pendientes para siguiente fase
- ¿Qué proveedores exportan reportes de forma confiable y con qué frecuencia?
- ¿Cuál es el formato y contenido exacto de esos reportes (columnas disponibles)?
- ¿El margen del 65% es fijo para todos los productos/proveedores o varía por categoría?
- ¿Se requiere historial de cotizaciones generadas (para seguimiento de ventas)?
- ¿Cuántos vendedores usarán el sistema simultáneamente y desde qué dispositivo (tablet, celular, PC en piso)?
- Nivel de automatización deseado para el Módulo 1 (manual/carga de reportes vs. acceso automatizado a plataformas) — pendiente de definir por temas técnicos y de términos de uso de cada proveedor.

---
*Documento preparado como insumo de planeación técnica, para uso en definición de arquitectura de solución con Claude Code.*
