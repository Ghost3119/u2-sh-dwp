# Portal de Catálogo de Productos - DWP Unidad 2

Proyecto monorepo con **TypeScript**, **Express** (backend) y **HTML + TS + CSS** (frontend sin frameworks).

Materia: **Desarrollo Web Profesional**  
Unidad: **2 - Saber Hacer**  
Alumno: **Camacho Ibarra Jorge Jair**

## Estructura

```
u2-sh-dwp/
├── backend/         (Express + TypeScript, capas: dominio, aplicacion, infraestructura, presentacion)
├── frontend/        (HTML + TS + CSS compilado con Vite, sin React)
├── package.json     (raíz con concurrently)
└── README.md
```

## Requisitos previos

- Node.js >= 18
- npm >= 9

## Instalación

Desde la raíz del proyecto:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

## Ejecución (un solo comando)

```bash
npm run dev
```

Esto inicia:
- **Backend** en `http://localhost:4000`
- **Frontend (Vite)** en `http://localhost:5173`

## Endpoints del Backend

| Método | Endpoint                | Descripción                       |
|--------|-------------------------|-----------------------------------|
| GET    | `/api/productos`        | Lista todos los productos         |
| GET    | `/api/productos/:id`    | Obtiene un producto por id        |
| GET    | `/api/buscar?q=termino` | Busca por nombre/desc/categoría   |
| GET    | `/api/categorias`       | Lista categorías únicas           |
| POST   | `/api/carrito`          | Crea un carrito (body: productoId, cantidad) |
| GET    | `/api/carrito/:id`      | Obtiene un carrito por id         |

## Requisitos cumplidos

1. **Funciones síncronas y asíncronas** — `ApiService` usa `fetch` + `async/await` + `Promise.all` con `try/catch`.
2. **Eventos del mouse** — click, mouseover, mouseout, mousemove, dblclick, contextmenu (clic derecho = favorito), drag & drop.
3. **Animaciones** — `@keyframes` CSS (`fadeInUp`, `slideUp`, `pulse`, `shake`, `bounce`, `fade-in`) y **Web Animations API** en la clase `Animador`.
4. **Transiciones** — CSS `transition` en hover, paneles laterales, inputs, botones, etc.
5. **POO** — Clases `Producto`, `Carrito`, `Animador` con encapsulamiento (`private`/`public`), getters, métodos públicos y privados.

## Funcionalidades del sitio

- Grid de productos cargados asíncronamente desde el backend
- Búsqueda en tiempo real con `debounce`
- Filtro por categorías
- Panel de detalle lateral con animación slide-in
- Carrito de compras lateral
- Sistema de favoritos (clic derecho, doble clic o arrastre a la zona drop)
- Cursor trail que sigue al mouse
- Efecto parallax en el hero
- Drag & drop para marcar favoritos
- Toast notifications

## Arquitectura backend (capas)

- **Dominio** (`Producto`, `Carrito`) — entidades puras sin dependencias externas
- **Aplicación** (`ProductoService`, `CarritoService`) — casos de uso
- **Infraestructura** (`ProductoRepository`) — acceso a datos (en memoria)
- **Presentación** (`routes.ts`) — controladores HTTP de Express

## Scripts individuales

```bash
# Solo backend
cd backend && npm run dev

# Solo frontend
cd frontend && npm run dev

# Compilar todo
npm run build
```
