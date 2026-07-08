# Portal TechStore - DWP Unidad 2

Proyecto monorepo **TypeScript** con **Express** (backend) y **HTML + TS + CSS** (frontend sin frameworks), con autenticación, base de datos SQLite y simulación de compras.

- Materia: **Desarrollo Web Profesional**
- Unidad: **2 - Saber Hacer** / **3 - Saber Hacer**
- Alumnos: 
    - **Camacho Ibarra Jorge Jair**
    - **Valdez Lara Yahir Alejandro**
    - **Santana Chavez Saul Fabian**

## Stack tecnologico

- **Backend:** Node.js, Express 4, TypeScript, better-sqlite3, bcryptjs, jsonwebtoken, helmet, express-rate-limit, CORS restrictivo
- **Frontend:** HTML, CSS, TypeScript compilado con Vite (sin React ni frameworks de UI)
- **Base de datos:** SQLite (archivo `backend/data/techstore.db`)
- **Paradigma:** Orientado a Objetos en ambos lados
- **Pruebas:** Jest + Supertest (64 tests pasando)

## Estructura

```
u2-sh-dwp/
├── backend/
│   ├── src/
│   │   ├── dominio/         (Producto, Carrito, Pedido, Usuario)
│   │   ├── aplicacion/      (ProductoService, AuthService, PedidoService)
│   │   ├── infraestructura/ (Database, Repositorios SQLite)
│   │   ├── presentacion/    (routes, middleware, validaciones)
│   │   ├── __tests__/       (Pruebas unitarias y e2e)
│   │   └── index.ts
│   ├── data/                (techstore.db se genera aqui)
│   ├── SECURITY.md          (Auditoria de seguridad)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── clases/          (Sesion, AuthService, Checkout, Pedido, Producto, Carrito, Animador)
│   │   ├── servicios/       (ApiService, SesionStorage)
│   │   ├── estilos/
│   │   ├── main.ts
│   │   └── index.html
│   └── package.json
├── tests/
│   └── screenshots/         (Capturas para el PDF)
│       ├── images/          (15 PNGs generados con Playwright)
│       └── instrucciones-manuales.md
├── package.json             (Raiz con concurrently)
└── README.md
```

## Requisitos previos

- Node.js >= 18
- npm >= 9

## Instalacion

Desde la raiz del proyecto:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

## Ejecucion

```bash
npm run dev
```

Esto inicia:
- **Backend** en `http://localhost:4000`
- **Frontend (Vite)** en `http://localhost:5173`

Al primer arranque, el backend crea automaticamente `backend/data/techstore.db` con 12 productos y el usuario demo.

## Credenciales de prueba

- **Usuario:** `demo`
- **Contrasena:** `demo123`

## Endpoints del Backend

### Publicos

| Metodo | Endpoint                | Descripcion                                     |
|--------|-------------------------|-------------------------------------------------|
| GET    | `/api/productos`        | Lista todos los productos                       |
| GET    | `/api/productos/:id`    | Obtiene un producto por id                      |
| GET    | `/api/buscar?q=termino` | Busca por nombre, descripcion o categoria       |
| GET    | `/api/categorias`       | Lista las categorias unicas                     |
| POST   | `/api/auth/registro`    | Crea cuenta: `{username, email, password, nombreCompleto}` |
| POST   | `/api/auth/login`       | Inicia sesion: `{username, password}`           |
| POST   | `/api/carrito`          | Legacy: crea un carrito (en memoria)            |
| GET    | `/api/carrito/:id`      | Legacy: obtiene un carrito                      |

### Protegidos (requieren `Authorization: Bearer <token>`)

| Metodo | Endpoint           | Descripcion                                          |
|--------|--------------------|------------------------------------------------------|
| GET    | `/api/auth/me`     | Devuelve el usuario actual                           |
| POST   | `/api/auth/logout` | Cierra la sesion (elimina token de la BD)            |
| POST   | `/api/pedidos`     | Crea un pedido: `{items:[{productoId, cantidad}], direccionEnvio}` |
| GET    | `/api/pedidos`     | Lista los pedidos del usuario autenticado            |
| GET    | `/api/pedidos/:id` | Detalle de un pedido (solo del dueno)                |

## Requisitos de la unidad cumplidos

1. **Funciones sincronas y asincronas** - `ApiService` con `fetch` + `async/await` + `Promise.all`, manejo de errores con `try/catch`. Funciones puras como `formatearPrecio`, `generarEstrellas` y `debounce` son sincronas.
2. **Eventos del mouse** - `click`, `mouseover`, `mouseout`, `mousemove`, `dblclick` (agrega al carrito), `contextmenu` (abre detalle, preventDefault), `dragstart`/`dragend`/`dragover`/`drop` (favoritos), parallax en el header.
3. **Animaciones** - `@keyframes` CSS (`fadeInUp`, `slideUp`, `pulse`, `shake`, `bounce`, `fade-in`) y **Web Animations API** en la clase `Animador` (`fadeIn`, `slideIn`, `shake`, `bounce`, `pulsoInfinito`).
4. **Transiciones** - CSS `transition` con `cubic-bezier` en hover de cards, paneles laterales, inputs, botones, header.
5. **Paradigma Orientado a Objetos** - Clases con encapsulamiento (`private`/`public`), getters, metodos publicos y privados. Backend con 4 capas (Dominio, Aplicacion, Infraestructura, Presentacion).
6. **Seguridad** - bcrypt (10 rounds), JWT con expiracion de 7 dias, helmet, express-rate-limit (100 req/15min), CORS solo para `http://localhost:5173`, validaciones, prepared statements (sin SQL injection), limite de body 10kb.

## Funcionalidades del sitio

- Grid de productos cargados asincronamente desde el backend
- Busqueda en tiempo real con `debounce`
- Filtro por categorias
- Panel de detalle lateral con animacion slide-in
- Carrito de compras lateral persistente en sesion
- Sistema de autenticacion con registro, login, logout
- Checkout con direccion de envio y confirmacion animada
- Historial de pedidos por usuario
- Sistema de favoritos (doble clic o arrastre a la zona drop)
- Cursor trail que sigue al mouse
- Efecto parallax en el header al mover el mouse
- Drag and drop para marcar favoritos
- Toast notifications
- Modales con animaciones de entrada/salida

## Arquitectura backend (capas)

- **Dominio** (`Producto`, `Carrito`, `Pedido`, `Usuario`) - entidades puras con encapsulamiento, sin dependencias externas
- **Aplicacion** (`ProductoService`, `AuthService`, `PedidoService`) - casos de uso y logica de negocio
- **Infraestructura** (`Database`, `ProductoRepository`, `UsuarioRepository`, `SesionRepository`, `PedidoRepository`) - acceso a datos con prepared statements y transacciones
- **Presentacion** (routes, middleware de auth, validaciones) - controladores HTTP, helmet, rate-limit, manejo de errores centralizado

## Pruebas

```bash
# Todas las pruebas (unit + e2e)
cd backend
npm test

# Solo unitarias
npm run test:unit

# Solo e2e
npm run test:e2e
```

**Estado actual: 64 tests pasando** (4 suites unitarias + 3 suites e2e, ~6.7 segundos).

Cobertura:
- Unit: `Producto`, `Carrito`, `Pedido`, `Usuario`
- E2E: `/api/auth/*`, `/api/productos`, `/api/pedidos` con casos de exito, validacion (400), autorizacion (401), conflicto (409)

## Capturas de pantalla

Las 15 capturas para el documento PDF estan en `tests/screenshots/images/`. Para regenerarlas:

1. Levanta el proyecto: `npm run dev` desde la raiz
2. Ejecuta: `node tests/screenshots/generar-faltantes.mjs`

Las capturas cubren todos los requisitos: landing publica, modales de auth, login exitoso, catalogo, detalle, carrito, checkout, pedido confirmado, historial, validaciones, headers de seguridad y estructura POO.

## Scripts individuales

```bash
# Solo backend (puerto 4000)
cd backend && npm run dev

# Solo frontend (puerto 5173)
cd frontend && npm run dev

# Compilar todo
npm run build

# Pruebas del backend
cd backend && npm test
```

## Seguridad

El archivo `backend/SECURITY.md` contiene la auditoria completa con:
- 20 controles verificados (con ruta y linea de codigo)
- Tabla de amenazas OWASP Top 10
- 15 recomendaciones priorizadas (Critico/Alto/Medio/Bajo)
