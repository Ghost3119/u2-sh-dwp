# Portal TechStore - DWP Unidades 2 y 3

Proyecto monorepo **TypeScript** con **Express** (backend) y **HTML + TS + CSS** (frontend sin frameworks), con autenticacion por roles, base de datos SQLite, simulacion de compras, recuperacion de contrasenas, gestion de multisesiones y panel de administrador.

- Materia: **Desarrollo Web Profesional**
- Unidades: **2 y 3 - Saber Hacer**
- Alumno: **Camacho Ibarra Jorge Jair**

## Stack tecnologico

- **Backend:** Node.js, Express 4, TypeScript, better-sqlite3, bcryptjs, jsonwebtoken, helmet, express-rate-limit, ua-parser-js, CORS restrictivo
- **Frontend:** HTML, CSS, TypeScript compilado con Vite (sin React ni frameworks de UI)
- **Base de datos:** SQLite (archivo `backend/data/techstore.db`)
- **Paradigma:** Orientado a Objetos en frontend y backend
- **Pruebas:** Jest + Supertest (108 tests pasando)

## Estructura

```
u2-sh-dwp/
├── backend/
│   ├── src/
│   │   ├── dominio/         (Producto, Carrito, Pedido, Usuario)
│   │   ├── aplicacion/      (ProductoService, AuthService, PedidoService, PasswordResetService)
│   │   ├── infraestructura/ (Database, Repositorios: Producto, Usuario, Sesion, Pedido, PasswordReset)
│   │   ├── presentacion/    (routes, middleware, validaciones, admin)
│   │   │   ├── auth.routes.ts
│   │   │   ├── password.routes.ts
│   │   │   ├── sesiones.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   ├── routes.ts
│   │   │   └── middleware/  (auth, role, validation, contexto-cliente)
│   │   ├── __tests__/       (Pruebas unitarias y e2e)
│   │   └── index.ts
│   ├── data/                (techstore.db se genera aqui)
│   ├── SECURITY.md          (Auditoria de seguridad)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── clases/          (Sesion, AuthService, Checkout, Pedido, Producto,
│   │   │                    Carrito, Animador, AdminPanel, GestorSesiones,
│   │   │                    RecuperacionPassword)
│   │   ├── servicios/       (ApiService, SesionStorage, utilidades)
│   │   ├── estilos/
│   │   ├── main.ts          (Router por hash + integracion)
│   │   └── index.html
│   └── package.json
├── tests/
│   └── screenshots/
│       ├── images/          (15 capturas U2)
│       │   └── u3/          (15 capturas U3)
│       ├── generar-faltantes.mjs
│       ├── generar-u3.mjs
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

Al primer arranque, el backend crea automaticamente `backend/data/techstore.db` con 12 productos, el usuario demo y el usuario admin.

## Credenciales de prueba

| Rol | Usuario | Contrasena |
|-----|---------|------------|
| admin | `admin` | `admin123` |
| cliente | `demo` | `demo123` |

## Endpoints del Backend

### Publicos

| Metodo | Endpoint                  | Descripcion                                                    |
|--------|---------------------------|----------------------------------------------------------------|
| GET    | `/api/productos`          | Lista todos los productos                                      |
| GET    | `/api/productos/:id`      | Obtiene un producto por id                                     |
| GET    | `/api/buscar?q=termino`   | Busca por nombre, descripcion o categoria                      |
| GET    | `/api/categorias`         | Lista las categorias unicas                                    |
| POST   | `/api/auth/registro`      | Crea cuenta: `{username, email, password, nombreCompleto}`     |
| POST   | `/api/auth/login`         | Inicia sesion: `{username, password}`                           |
| POST   | `/api/auth/recuperar`     | Solicita recuperacion de contrasena: `{email}`                  |
| POST   | `/api/auth/resetear`      | Cambia la contrasena con token: `{token, nuevoPassword}`        |
| POST   | `/api/carrito`            | Legacy: crea un carrito (en memoria)                           |
| GET    | `/api/carrito/:id`        | Legacy: obtiene un carrito                                     |

### Protegidos - cualquier usuario autenticado

| Metodo | Endpoint                | Descripcion                                              |
|--------|-------------------------|----------------------------------------------------------|
| GET    | `/api/auth/me`          | Devuelve el usuario actual (incluye `rol`)               |
| POST   | `/api/auth/logout`      | Cierra la sesion (elimina token de la BD)                |
| POST   | `/api/pedidos`          | Crea pedido: `{items:[{productoId, cantidad}], direccionEnvio}` |
| GET    | `/api/pedidos`          | Lista los pedidos del usuario autenticado                |
| GET    | `/api/pedidos/:id`      | Detalle de un pedido (solo del dueno)                    |
| GET    | `/api/sesiones`         | Lista sesiones activas del usuario (con `esActual`)      |
| DELETE | `/api/sesiones/:id`     | Cierra una sesion especifica                             |
| DELETE | `/api/sesiones/otras`   | Cierra todas las sesiones excepto la actual              |

### Protegidos - solo admin

| Metodo | Endpoint                                | Descripcion                                          |
|--------|-----------------------------------------|------------------------------------------------------|
| GET    | `/api/admin/estadisticas`               | Stats: usuarios, pedidos, ingresos, top productos    |
| GET    | `/api/admin/usuarios`                   | Lista todos los usuarios                             |
| GET    | `/api/admin/usuarios/:id/sesiones`      | Sesiones de un usuario especifico                    |
| DELETE | `/api/admin/usuarios/:id`               | Elimina un usuario (no a si mismo)                   |
| GET    | `/api/admin/pedidos`                    | Lista TODOS los pedidos del sistema                  |
| PATCH  | `/api/admin/pedidos/:id/estado`         | Cambia estado: `{estado}` (5 estados validos)        |
| POST   | `/api/admin/productos`                  | Crea un producto                                     |
| PUT    | `/api/admin/productos/:id`              | Actualiza un producto                                |
| DELETE | `/api/admin/productos/:id`              | Elimina un producto                                  |

## Requisitos Unidad 2 cumplidos

1. **Funciones sincronas y asincronas** - `ApiService` con `fetch` + `async/await` + `Promise.all`, manejo de errores con `try/catch`. Funciones puras como `formatearPrecio`, `generarEstrellas` y `debounce` son sincronas.
2. **Eventos del mouse** - `click`, `mouseover`, `mouseout`, `mousemove`, `dblclick` (agrega al carrito), `contextmenu` (abre detalle, preventDefault), `dragstart`/`dragend`/`dragover`/`drop` (favoritos), parallax en el header.
3. **Animaciones** - `@keyframes` CSS (`fadeInUp`, `slideUp`, `pulse`, `shake`, `bounce`, `fade-in`) y **Web Animations API** en la clase `Animador` (`fadeIn`, `slideIn`, `shake`, `bounce`, `pulsoInfinito`).
4. **Transiciones** - CSS `transition` con `cubic-bezier` en hover de cards, paneles laterales, inputs, botones, header.
5. **Paradigma Orientado a Objetos** - Clases con encapsulamiento (`private`/`public`), getters, metodos publicos y privados. Backend con 4 capas (Dominio, Aplicacion, Infraestructura, Presentacion).

## Requisitos Unidad 3 cumplidos

1. **Autenticacion por tipo de usuario**
   - Campo `rol` en tabla `usuarios` con valores `'admin'` o `'cliente'`
   - Middleware `requerirRol(...)` y `requerirAdmin` para validar acceso
   - Header del frontend muestra "Panel Admin" solo a usuarios administradores
   - Rutas backend `/api/admin/*` bloqueadas con 403 para clientes

2. **Manejo de multisesiones**
   - Cada login crea un registro nuevo en la tabla `sesiones` (multisesion real)
   - Tracking de `dispositivo`, `ip` y `userAgent` por sesion
   - `GET /api/sesiones` lista sesiones activas del usuario con badge "actual"
   - `DELETE /api/sesiones/:id` cierra una sesion especifica
   - `DELETE /api/sesiones/otras` cierra todas excepto la actual
   - Frontend: seccion "Mis Sesiones" con lista de dispositivos

3. **Recuperacion de contrasenas**
   - Tabla `password_resets` con tokens hasheados (SHA-256) y expiracion de 30 min
   - `POST /api/auth/recuperar` con email genera token (en dev se muestra en pantalla)
   - `POST /api/auth/resetear` con token + nuevo password actualiza y cierra TODAS las sesiones
   - El token NUNCA se guarda en texto plano
   - Por seguridad, no se filtra si un email existe o no
   - Frontend: modal de 3 pasos (solicitar -> token + nuevo pass -> confirmacion)

4. **Proteccion de rutas**
   - Backend: middleware `requerirAuth` valida JWT + sesion activa en BD
   - Backend: middleware `requerirRol` valida el rol del usuario
   - Frontend: router por hash (`#/`, `#/pedidos`, `#/sesiones`, `#/admin/...`) valida sesion y rol
   - Intentar acceder a `#/admin` siendo cliente redirige con toast de error

## Funcionalidades del sitio

### Catalogo y compras
- Grid de productos cargados asincronamente desde el backend
- Busqueda en tiempo real con `debounce`
- Filtro por categorias
- Panel de detalle lateral con animacion slide-in
- Carrito de compras lateral persistente en sesion
- Checkout con direccion de envio y confirmacion animada
- Historial de pedidos por usuario

### Autenticacion
- Registro con validacion frontend y backend
- Login con JWT
- Logout que elimina sesion de la BD
- Recuperacion de contrasena con tokens hasheados
- "Olvidaste tu contrasena?" en modal de login

### Multisesiones
- Ver dispositivos conectados con su IP y user agent
- Cerrar sesiones individuales
- Cerrar todas las demas sesiones
- Badge de "Sesion actual"

### Panel de administrador
- Dashboard con estadisticas (usuarios, pedidos, ingresos, top productos)
- Gestion de usuarios (listar, eliminar)
- Gestion de pedidos (ver todos, cambiar estado)
- Gestion de productos (CRUD completo)

### Interactividad
- Sistema de favoritos (doble clic o arrastre)
- Cursor trail que sigue al mouse
- Efecto parallax en el header al mover el mouse
- Toast notifications
- Modales con animaciones de entrada/salida
- Hover con transiciones suaves

## Arquitectura backend (capas)

- **Dominio** (`Producto`, `Carrito`, `Pedido`, `Usuario`) - entidades puras con encapsulamiento
- **Aplicacion** (`ProductoService`, `AuthService`, `PedidoService`, `PasswordResetService`) - casos de uso y logica de negocio
- **Infraestructura** (`Database`, repositorios) - acceso a datos con prepared statements y transacciones
- **Presentacion** (routes, middlewares) - controladores HTTP, helmet, rate-limit, manejo de errores centralizado

## Pruebas

```bash
cd backend
npm test          # Todas (108 tests, ~13s)
npm run test:unit # Solo unitarias
npm run test:e2e  # Solo e2e
```

**Estado actual: 108 tests pasando** en 10 suites (~13 segundos).

Cobertura:
- Unit: `Producto`, `Carrito`, `Pedido`, `Usuario`, validaciones
- E2E: `auth`, `productos`, `pedidos` (U2) + `password`, `sesiones`, `admin` (U3)
- Casos cubiertos: exito, validacion (400), autorizacion (401), permisos (403), conflicto (409), no encontrado (404)

## Capturas de pantalla

### Unidad 2 (15 capturas)
En `tests/screenshots/images/`:
- Landing publica, modales auth, login exitoso, grid, detalle, carrito, checkout, pedido confirmado, mis pedidos, detalle pedido, busqueda filtrada, headers de seguridad, estructura POO, validacion

Regenerar con: `node tests/screenshots/generar-faltantes.mjs` (con servidores levantados)

### Unidad 3 (15 capturas)
En `tests/screenshots/images/u3/`:
- Landing sin sesion, modal login con "¿Olvidaste?", recuperacion (3 pasos), login admin, dashboard admin, gestion usuarios/pedidos/productos, dropdown estado, mis sesiones, confirmacion cerrar sesion, header cliente, bloqueo ruta admin

Regenerar con: `node tests/screenshots/generar-u3.mjs` (con servidores levantados)

## Scripts individuales

```bash
# Solo backend (puerto 4000)
cd backend && npm run dev

# Solo frontend (puerto 5173)
cd frontend && npm run dev

# Compilar todo
npm run build

# Pruebas
cd backend && npm test

# Inicializar BD manualmente
cd backend && npm run seed
```

## Seguridad

El archivo `backend/SECURITY.md` contiene la auditoria completa con:
- 20 controles verificados (con ruta y linea de codigo)
- Tabla de amenazas OWASP Top 10
- 15 recomendaciones priorizadas (Critico/Alto/Medio/Bajo)

Medidas implementadas:
- Contrasenas hasheadas con bcrypt (10 rounds)
- Tokens JWT con expiracion de 7 dias
- Tokens de recuperacion hasheados con SHA-256, expiracion 30 min, un solo uso
- Reset de contrasena invalida todas las sesiones del usuario
- helmet para headers de seguridad
- express-rate-limit (100 req/15min por IP)
- CORS restrictivo a `http://localhost:5173`
- Validaciones en todos los endpoints
- Prepared statements (sin SQL injection)
- Limite de payload JSON 10kb
