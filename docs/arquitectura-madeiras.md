# Arquitectura del Sistema — Madeiras
> Documento de referencia técnica. Actualizar conforme avanza el desarrollo.

**Proyecto:** Sistema de Asistencia de Ventas para Mueblería Madeiras  
**Estado general:** `[ ] Planeación` → `[ ] MVP` → `[ ] Automatización` → `[ ] CRM`  
**Última actualización:** Julio 2026

---

## Contexto

Mueblería con 8-9 proveedores externos (Coaster, Happy Homes, Home Elegance, ChromeMart, Furnitures, entre otros). Cada proveedor tiene su propio portal web con acceso independiente. El vendedor gasta 40-60 min por cliente buscando, comparando y calculando manualmente.

**Objetivo:** Centralizar catálogos, normalizar datos, aplicar margen y entregar cotización al vendedor en 2-3 minutos.

---

## Flujo general del sistema

```
Proveedores (portales web / CSV exports)
        │
        ▼
┌─────────────────────────┐
│  Módulo 1: Extracción   │  ← CSV manual (Fase 1) → scraping/API (Fase 2)
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  Módulo 2: Normalización│  ← ETL → esquema unificado en Supabase
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  Módulo 3: Catálogo     │  ← búsqueda, filtros, disponibilidad
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Módulo 4: Pricing      │  ← aplica margen configurable → precio de venta
└──────────┬──────────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
┌─────────┐  ┌──────────────────────────────┐
│ Módulo  │  │ Módulo 5B: WhatsApp / Chat   │
│ 5A: UI  │  │ (n8n + Claude + Whisper)     │
│ filtros │  └──────────────────────────────┘
└─────────┘
     │
     ▼
┌─────────────────────────┐
│  Módulo 6: Imágenes     │  ← Supabase Storage
└─────────────────────────┘
```

---

## Módulos

### Módulo 1 — Extracción de Catálogos
| Campo | Valor |
|---|---|
| Estado | `⬜ Pendiente` |
| Responsabilidad | Traer datos de cada proveedor al sistema |

**Fase 1 (MVP):** Carga manual de archivos CSV/Excel exportados desde cada portal.  
**Fase 2:** Sincronización automática con Firecrawl (acceso a portales con credenciales de Madeiras).

**Tareas:**
- [ ] Mapear qué proveedores exportan CSV/Excel y formato de cada uno
- [ ] Definir cadencia de actualización (diaria / semanal / on-demand)
- [ ] Escribir script de importación por proveedor (`importar-coaster.mjs`, etc.)
- [ ] Evaluar portales que no exportan → scraping con Firecrawl
- [ ] Manejar imágenes: descargar URLs o referenciarlas directamente

**Notas:**
- Requiere sesión de reconocimiento con Madeiras en vivo con los portales reales
- Algunos portales pueden tener APIs no documentadas — preguntar al rep del proveedor
- Checklist de reconocimiento de portales → `docs/checklist-portales.csv`

---

### Módulo 2 — Normalización y Modelo Unificado
| Campo | Valor |
|---|---|
| Estado | `⬜ Pendiente` |
| Responsabilidad | Transformar datos crudos de cada proveedor a esquema común |

**Esquema de la tabla `madeiras.productos`:**

```sql
CREATE SCHEMA IF NOT EXISTS madeiras;

CREATE TABLE madeiras.productos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor    text        NOT NULL,       -- 'coaster' | 'happy_homes' | 'home_elegance' | ...
  sku_origen   text,                       -- SKU tal como viene del proveedor
  nombre       text,
  categoria    text,                       -- 'sala' | 'comedor' | 'recamara' | 'oficina' | ...
  tipo         text,                       -- 'sofa' | 'seccional' | 'mesa' | 'silla' | ...
  color        text,
  material     text,                       -- 'tela' | 'cuero' | 'madera' | ...
  dimensiones  jsonb,                      -- { "largo": 220, "ancho": 95, "alto": 88 } (cm)
  precio_costo numeric(10,2),
  disponible   boolean     DEFAULT true,
  inventario   integer,
  foto_url     text,
  variantes    jsonb,                      -- [{ "color": "gris", "sku": "...", "disponible": true }]
  raw_data     jsonb,                      -- fila original del import (para debugging)
  importado_en timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE madeiras.configuracion (
  clave  text PRIMARY KEY,
  valor  text NOT NULL
);
-- Valores iniciales:
-- ('margen_default', '65')
-- ('margen_sala', '65')
-- ('margen_comedor', '65')

CREATE TABLE madeiras.cotizaciones (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor     text,
  items        jsonb,       -- [{ producto_id, nombre, proveedor, precio_costo, precio_venta, cantidad }]
  total_venta  numeric(10,2),
  total_costo  numeric(10,2),
  created_at   timestamptz DEFAULT now()
);
```

**Tareas:**
- [ ] Crear schema `madeiras` en Supabase Lab project
- [ ] Correr SQL de creación de tablas
- [ ] Hacer GRANT permissions + exponer schema en dashboard
- [ ] Escribir función de normalización por proveedor (mapeo de columnas → esquema común)
- [ ] Definir taxonomía de `categoria` y `tipo` (consensuar con Madeiras)
- [ ] Manejar duplicados: mismo producto en 2 proveedores → campo `equivalencias` futuro

---

### Módulo 3 — Catálogo Unificado / Consulta
| Campo | Valor |
|---|---|
| Estado | `⬜ Pendiente` |
| Responsabilidad | Búsqueda y filtros sobre el catálogo normalizado |

**Endpoints a crear en `api.mjs`:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/productos` | Listar con filtros: `?tipo=sofa&color=gris&max_precio_venta=1200&proveedor=coaster&disponible=true` |
| GET | `/api/productos/:id` | Detalle de un producto |
| GET | `/api/categorias` | Lista de categorías y tipos disponibles |
| GET | `/api/proveedores` | Lista de proveedores activos |

**Tareas:**
- [ ] Implementar endpoint GET `/api/productos` con filtros dinámicos
- [ ] Paginación (limit/offset) para catálogos grandes
- [ ] Búsqueda por texto libre (`?q=sofa+seccional+beige`)
- [ ] Índices en Supabase: `categoria`, `tipo`, `color`, `proveedor`, `disponible`

---

### Módulo 4 — Motor de Pricing
| Campo | Valor |
|---|---|
| Estado | `⬜ Pendiente` |
| Responsabilidad | Calcular precio de venta a partir del costo y reglas del negocio |

**Fórmula base:**
```
precio_venta = precio_costo / (1 - margen)
-- Con margen=0.65: precio_venta = costo / 0.35
-- Ejemplo: costo $350 → precio_venta = $350 / 0.35 = $1,000
```

> **Nota:** Confirmar con Madeiras si el margen es sobre costo (markup) o sobre venta (margin). La fórmula arriba es margin sobre venta (65%). Si es markup sería: `precio_venta = costo * 1.65`.

**Tareas:**
- [ ] Confirmar fórmula exacta con Madeiras
- [ ] Implementar función `calcularPrecioVenta(costo, categoria)` en `api.mjs`
- [ ] Leer margen desde `madeiras.configuracion` (no hardcodeado)
- [ ] Endpoint POST `/api/cotizaciones` — guarda cotización generada

---

### Módulo 5A — Interfaz del Vendedor (Catálogo con Filtros)
| Campo | Valor |
|---|---|
| Estado | `⬜ Pendiente` |
| Responsabilidad | UI web para búsqueda, comparación y cotización |
| Archivo | `vendedor/index.html` (SPA inline) |

**Flujo de pantalla:**
1. Panel de filtros izquierdo: tipo, color, rango precio venta, proveedor, disponibilidad
2. Grid de resultados: tarjetas con foto, nombre, proveedor, precio venta, disponibilidad
3. Click en tarjeta → panel de detalle / variantes
4. Botón "Agregar a cotización" → lista de cotización flotante
5. "Ver cotización" → resumen con total, PDF o pantalla imprimible

**Tareas:**
- [ ] Wireframe / mockup de la pantalla principal
- [ ] Implementar filtros y llamada a `/api/productos`
- [ ] Grid de tarjetas de producto con foto
- [ ] Modal de detalle de producto
- [ ] Constructor de cotización (lista lateral)
- [ ] Vista de cotización imprimible / PDF

---

### Módulo 5B — Asistente en WhatsApp / Telegram
| Campo | Valor |
|---|---|
| Estado | `⬜ Pendiente` |
| Responsabilidad | Canal conversacional por voz o texto para el vendedor |
| Stack | n8n + Claude API + Whisper + Supabase |

**Flujo:**
```
Vendedor (WhatsApp/Telegram)
    │  manda: voice note | foto | texto
    ▼
n8n (webhook receptor)
    │
    ├─ si audio → Whisper (transcripción) → texto
    ├─ si imagen → Claude Vision (descripción del mueble)
    └─ si texto → directo
    │
    ▼
Claude API (claude-sonnet-4-6)
    Prompt: "Interpreta esta descripción y extrae: tipo, color, material, presupuesto_max"
    Returns: JSON con criterios de búsqueda
    │
    ▼
Supabase query (Módulo 3)
    │
    ▼
Claude API (formateo de respuesta)
    Returns: mensaje con top 3-5 opciones + precios
    │
    ▼
Vendedor recibe respuesta en WhatsApp/Telegram
```

**Tareas:**
- [ ] Configurar bot en WhatsApp Business API o Telegram Bot
- [ ] Crear workflow en n8n: recibir → transcribir → interpretar → buscar → responder
- [ ] Prompt de interpretación de intención del vendedor
- [ ] Prompt de formateo de respuesta (texto corto, claro, con precios)
- [ ] Manejo de follow-ups ("¿lo tienes en azul?", "¿algo más barato?")

---

### Módulo 6 — Imágenes de Producto
| Campo | Valor |
|---|---|
| Estado | `⬜ Pendiente` |
| Responsabilidad | Almacenar y servir fotos de productos |
| Stack | Supabase Storage bucket `madeiras-fotos` |

**Tareas:**
- [ ] Crear bucket `madeiras-fotos` en Supabase Storage (público)
- [ ] En importación: descargar imagen de URL del proveedor → subir a bucket → guardar URL pública en `productos.foto_url`
- [ ] Fallback si no hay foto: placeholder genérico por categoría

---

## Stack tecnológico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Backend API | Node.js + Express (ESM `.mjs`) | `api.mjs` en raíz del proyecto |
| Base de datos | Supabase (PostgreSQL) | Schema `madeiras` en proyecto Lab |
| Almacenamiento fotos | Supabase Storage | Bucket `madeiras-fotos` |
| Extracción Fase 1 | Scripts Node.js + CSV/Excel | `importar-<proveedor>.mjs` |
| Extracción Fase 2 | Firecrawl API | Scraping con credenciales de Madeiras |
| UI vendedor | HTML/CSS/JS single file | `vendedor/index.html` — sin build step |
| Asistente chat | n8n (self-hosted) | Workflows de orquestación |
| Transcripción voz | OpenAI Whisper API | Dentro del workflow n8n |
| IA interpretación | Claude API (`claude-sonnet-4-6`) | Interpretación de búsqueda + formateo |
| PDF cotización | Puppeteer | Misma plantilla que otros proyectos |
| Dev server local | `serve.mjs` (puerto 3000) | Ya en el proyecto |
| Screenshots | `screenshot.mjs` + Puppeteer | Ya en el proyecto |

---

## Supabase — Setup

**Proyecto:** ExecutionAI Lab (proyecto compartido)  
**Schema:** `madeiras`

```sql
-- 1. Crear schema
CREATE SCHEMA IF NOT EXISTS madeiras;

-- 2. Grants
GRANT USAGE ON SCHEMA madeiras TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA madeiras TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA madeiras TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA madeiras GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA madeiras GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
```

**3. En Supabase Dashboard:** Settings → API → Exposed schemas → agregar `madeiras` → Save.

**Client init en `api.mjs`:**
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'madeiras' } }
);
```

---

## Variables de entorno requeridas

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_TOKEN                  # auth simple para la UI del vendedor
ANTHROPIC_API_KEY            # Claude API (Módulo 5B + futuro)
OPENAI_API_KEY               # Whisper transcripción (Módulo 5B)
```

---

## Decisiones tomadas

| Decisión | Elegida | Alternativa descartada | Razón |
|---|---|---|---|
| Fuente de datos Fase 1 | CSV/Excel manual | Scraping inmediato | Menor riesgo técnico, arrancar rápido |
| Fuente de datos Fase 2 | Firecrawl | Puppeteer custom scraper | Más mantenible, maneja JS automáticamente |
| UI Módulo 5A | Single HTML file (sin framework) | React/Vue | Consistencia con otros proyectos, sin build step |
| Canal chat Módulo 5B | WhatsApp o Telegram | App móvil propia | El vendedor ya usa WhatsApp, cero adopción requerida |
| Motor IA | Claude API (Sonnet) | GPT-4o | Mejor razonamiento estructurado, JSON más confiable |
| Orquestación chat | n8n | Código custom en api.mjs | Flujos visuales, modificable sin código |
| DB schema | `madeiras` en Lab Supabase | Supabase nuevo proyecto | Conserva el free tier para proyectos reales |
| Fórmula precio | Por definir | — | Pendiente confirmar con Madeiras: ¿markup o margin? |

---

## Preguntas abiertas

- [ ] ¿Cuáles proveedores exportan CSV/Excel? ¿Qué columnas tiene cada export?
- [ ] ¿El margen es sobre venta (65%) o sobre costo (markup 65%)? → impacta fórmula
- [ ] ¿Cuántos vendedores simultáneos? → afecta decisión de auth y concurrencia
- [ ] ¿Dispositivo principal en piso: tablet, celular, PC? → afecta diseño UI
- [ ] ¿Se quiere historial de cotizaciones? → tabla `cotizaciones` ya planificada
- [ ] ¿WhatsApp Business API (requiere número dedicado y aprobación Meta) o Telegram? → Telegram es más rápido de implementar

---

## Roadmap / Estado por fase

### Fase 1 — MVP: Catálogo Unificado Interno
- [ ] Módulo 2: Crear schema y tablas en Supabase
- [ ] Módulo 1: Sesión de reconocimiento con Madeiras + scripts de importación por proveedor
- [ ] Módulo 3: API de consulta con filtros
- [ ] Módulo 4: Motor de pricing
- [ ] Módulo 5A: UI del vendedor (filtros + tarjetas + cotización)
- [ ] Módulo 6: Supabase Storage para fotos

### Fase 2 — Automatización + Chat
- [ ] Módulo 1 → Firecrawl: sincronización periódica automática
- [ ] Deploy en Render + dominio
- [ ] Módulo 5B: Asistente en WhatsApp/Telegram con n8n + Claude

### Fase 3 — CRM + Analytics
- [ ] Historial de cotizaciones por vendedor
- [ ] Registro de clientes y seguimiento de conversiones
- [ ] Dashboard del dueño: márgenes, rotación por proveedor, categorías top
