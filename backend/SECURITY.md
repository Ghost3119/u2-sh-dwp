# Auditoría de Seguridad — Portal TechStore (DWP Unidad 2)

**Proyecto:** Saber Hacer U2 — Desarrollo Web Profesional
**Alumno:** Camacho Ibarra Jorge Jair
**Stack:** Express 4 + better-sqlite3 + bcryptjs + jsonwebtoken + helmet + express-rate-limit + TypeScript (backend) / HTML+TS+Vite (frontend)
**Fecha de auditoría:** Junio 2026

---

## 1. Revisión de lo implementado (estado real del código)

Esta sección refleja **únicamente lo que se encuentra actualmente en el repositorio** (verificado en `backend/src/` y `frontend/src/`). Marca lo que ya está y lo que falta.

### 1.1 Controles de seguridad implementados ✅

| # | Control | Ubicación | Detalle |
|---|---------|-----------|---------|
| 1 | **Hashing de contraseñas con bcrypt** | `backend/src/infraestructura/database.ts:125` y `backend/src/__tests__/helpers/dbTest.ts:62` | `bcrypt.hashSync('demo123', 10)` — 10 rounds. Se usa `bcryptjs` (puro JS, sin compilación nativa). En producción: 10–12 rounds, constante `BCRYPT_ROUNDS = 10` en `AuthService.ts:11`. |
| 2 | **JWT firmado con expiración** | `backend/src/aplicacion/AuthService.ts:85-91` | `jsonwebtoken` con `HS256`, payload `{ usuarioId, username, jti }`, `expiresIn: '7d'`. Cada token además se guarda en la tabla `sesiones` con su `expires_at`, lo que permite revocación. |
| 3 | **`helmet()` configurado** | `backend/src/index.ts:17` | `app.use(helmet())` aplica cabeceras `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, etc. También `app.disable('x-powered-by')` (línea 16) para no filtrar Express. |
| 4 | **`express-rate-limit` activo** | `backend/src/index.ts:28-38` | Global: 100 req / 15 min en `/api`. Mensaje 429 con JSON `{ success: false, error: ... }`. `standardHeaders: true` envía `RateLimit-*`. |
| 5 | **CORS restrictivo** | `backend/src/index.ts:18-25` | `cors({ origin: 'http://localhost:5173', credentials: true, methods: [...], allowedHeaders: [...] })`. Solo el frontend en Vite puede llamar. |
| 6 | **Validación de entrada con middleware** | `backend/src/presentacion/middleware/validation.middleware.ts` | `validarCampos([...])` valida `username` (3-20, alfanumérico), `email` (regex), `password` (≥6), `nombreCompleto` (1-100). Usado en `auth.routes.ts:15-19`. El `POST /api/pedidos` valida items y dirección inline en `pedidos.routes.ts:16-44`. |
| 7 | **Prepared statements (anti SQL injection)** | Todos los repositorios | `UsuarioRepository`, `SesionRepository`, `ProductoRepository`, `PedidoRepository` usan `conn.prepare(...).run/get/all(?, ?, ...)`. **Cero concatenación de strings en queries.** |
| 8 | **Límite de payload JSON** | `backend/src/index.ts:26` | `express.json({ limit: '10kb' })` previene DoS por body gigante. El handler 413 está en `index.ts:83-85`. |
| 9 | **Sesiones con expiración en BD** | `backend/src/infraestructura/database.ts:47-53` | Tabla `sesiones(token, usuario_id, created_at, expires_at)` con `ON DELETE CASCADE`. `index.ts:14` purga sesiones expiradas al arrancar. |
| 10 | **Middleware `requerirAuth`** | `backend/src/presentacion/middleware/auth.middleware.ts:23-74` | Verifica `Authorization: Bearer ...`, valida JWT con `JWT_SECRET`, busca la sesión en BD, valida `expires_at`, **comprueba que `sesion.usuarioId === payload.usuarioId`** (defensa contra reuso de token con sesión borrada). |
| 11 | **`x-powered-by` deshabilitado** | `backend/src/index.ts:16` | No se filtra la versión de Express en respuestas. |
| 12 | **No enumeración de usuarios en login** | `backend/src/aplicacion/AuthService.ts:62-69` | Tanto "usuario no existe" como "password incorrecta" devuelven `AuthError('Credenciales invalidas', 401)` con el mismo mensaje. |
| 13 | **Hash nunca viaja en respuestas** | `backend/src/dominio/Usuario.ts:36-44` | `Usuario.toDTO()` omite `passwordHash` (tipo `Omit<IUsuario, 'passwordHash'>`). Tests en `auth.e2e.test.ts:29` y `Usuario.test.ts:38` lo verifican. |
| 14 | **Cast a número seguro** | `routes.ts:22-25, 74-78`, `pedidos.routes.ts:74-78` | `parseInt(...)` con `Number.isInteger` y `> 0` evita inyección por query params maliciosos. |
| 15 | **Manejo de errores centralizado** | `backend/src/index.ts:81-95` | `try/catch` global con respuestas JSON estructuradas `{ success, error }`. En producción oculta el mensaje real (`process.env.NODE_ENV === 'production'`). |
| 16 | **Transacciones para descontar stock + crear pedido** | `PedidoRepository.ts:30-81`, `ProductoRepository.ts:121-137` | `db.transaction(() => {...})` de better-sqlite3 garantiza atomicidad: si falla el INSERT del pedido, no se descuenta stock. |
| 17 | **PRAGMA `foreign_keys = ON`** | `database.ts:22` y `dbTest.ts:8` | Integridad referencial activa (FK `sesiones.usuario_id → usuarios.id`, `pedidos.usuario_id → usuarios.id`, etc.). |
| 18 | **PRAGMA `journal_mode = WAL`** | `database.ts:23` | Mejor concurrencia (lectores no bloquean escritor) y durabilidad. |
| 19 | **Logging de requests con duración** | `backend/src/index.ts:40-49` | Cada request loguea método, URL, status y duración. Útil para detectar anomalías. |
| 20 | **Seed controlado (idempotente)** | `database.ts:85-130` | Inserta productos y usuario demo solo si la tabla está vacía. |

### 1.2 Gaps / oportunidades detectadas

| # | Hallazgo | Impacto | Estado |
|---|----------|---------|--------|
| A | **No hay HTTPS en el servidor** (escucha en HTTP plano en puerto 4000) | Tokens JWT viajarian en claro si se desplegara tal cual. | ⚠️ Documentado (mitigar con reverse proxy + TLS en producción) |
| B | **No hay `npm audit` en CI** | Dependencias podrían tener CVEs sin enterarse. | ⚠️ Revisar |
| C | **Frontend hace `innerHTML` con datos del backend** (vulnerable a XSS si backend aceptara HTML) | Defensa en profundidad falta. Hoy el backend no acepta HTML en `nombre`/`descripcion` de productos (solo seed), pero si en el futuro se permite editarlos, habría XSS. | ⚠️ Mitigado parcialmente (no hay endpoint de edición) |
| D | **`JWT_SECRET` por defecto cae a un string fijo** (`'techstore-dev-secret-change-in-prod'`) | Si no se define `JWT_SECRET` en producción, los tokens son falsificables. | ⚠️ Aceptable en dev; crítico en prod |
| E | **No hay rate limit específico para `/api/auth/login`** (solo el global de 100/15min) | Un atacante podría hacer 100 intentos de password por IP cada 15 min. | 🟡 Mejorable (recomendado: 5/15min en login) |
| F | **No hay refresh tokens** | Token vive 7 días sin posibilidad de renovar ni rotar. | 🟡 Aceptable para la unidad |
| G | **No hay CSRF token** | No aplica porque se usa `Authorization: Bearer` (no se envían cookies de sesión). | ✅ N/A |
| H | **Logging estructurado profesional (pino/winston)** | Solo `console.log` plano. No hay niveles, no hay rotación, no hay agregación. | 🟡 Bajo |
| I | **CSP estricta** | `helmet()` la aplica por defecto pero no se ha personalizado para `script-src 'self'`. | 🟡 Bajo |
| J | **No hay sanitización de inputs a nivel de HTML** | `express-validator` o `DOMPurify` no se usan. | 🟡 Bajo |
| K | **No hay middleware de request size para multipart** | Solo hay `express.json({ limit: '10kb' })`. Si se suben imágenes en el futuro, hay que configurar `multer` con límite. | ✅ N/A (no hay uploads) |

---

## 2. Tabla de amenazas OWASP Top 10 (estado real)

| Amenaza | Mitigación implementada | Estado |
|---------|-------------------------|--------|
| **A01 Broken Access Control** | `requerirAuth` valida JWT + sesión en BD + expiración + `usuarioId` consistente. `GET /api/pedidos` y `GET /api/pedidos/:id` filtran por `usuarioId` del token. Tests e2e `pedidos.e2e.test.ts` (líneas 105-130, 138-156) verifican que un usuario NO ve pedidos de otro. | ✅ OK |
| **A02 Cryptographic Failures** | bcryptjs 10 rounds, JWT HS256 con expiración 7d, `passwordHash` no se filtra en DTOs. | ✅ OK |
| **A03 Injection (SQL)** | 100% prepared statements con `?` en los 4 repositorios. Sin concatenación. | ✅ OK |
| **A03 Injection (XSS)** | Backend no acepta HTML en inputs (regex alfanumérico en username, regex email, sin campo de descripción libre en registro). Frontend hace `innerHTML` con datos del seed (no controlables por usuarios). | ✅ OK (con caveat C arriba) |
| **A03 Injection (NoSQL)** | No aplica (SQLite relacional). | ✅ N/A |
| **A04 Insecure Design** | Arquitectura en capas dominio / aplicación / infraestructura / presentación. Separación de responsabilidades clara. | ✅ OK |
| **A05 Security Misconfiguration** | helmet, CORS restrictivo, `x-powered-by` off, errores 500 con mensajes genéricos en producción. | ✅ OK |
| **A06 Vulnerable Components** | `package.json` con versiones fijas (`^X.Y.Z`). No se ejecuta `npm audit` en CI. | ⚠️ Revisar |
| **A07 Identification & Auth Failures** | bcrypt + JWT + expiración + sesión en BD revocable + no enumeración + validación de inputs en registro. | ✅ OK |
| **A08 Software & Data Integrity** | No hay verificación de integridad de deps ni signatures (`npm audit signatures`). | ⚠️ Revisar |
| **A09 Logging & Monitoring** | Logging básico de requests en `index.ts:40-49` con método, URL, status y duración. No hay log de eventos de seguridad (login fallido, etc.) de forma centralizada. | ⚠️ Mejorable |
| **A10 SSRF** | El backend no hace fetch a URLs externas desde el servidor. | ✅ N/A |
| **Rate limiting / DoS** | `express-rate-limit` global 100 req / 15 min en `/api`. | ✅ OK (mejorable con limiter dedicado para `/api/auth`) |
| **CSRF** | Se usa header `Authorization: Bearer` (no hay cookies de sesión), no aplica CSRF. | ✅ N/A |
| **Passwords en texto plano** | Hash bcryptjs 10 rounds. | ✅ OK |
| **Tokens sin expiración** | JWT expira en 7d, sesión en BD se valida en cada request y se purga al expirar. | ✅ OK |
| **Sesiones sin revocar** | `POST /api/auth/logout` elimina la fila de `sesiones` (`auth.routes.ts:60-62`). | ✅ OK |
| **Tokens reutilizables con sesión borrada** | `requerirAuth` compara `sesion.usuarioId === payload.usuarioId` y rechaza si la sesión ya no existe. | ✅ OK |
| **DoS por payload gigante** | `express.json({ limit: '10kb' })` + handler 413. | ✅ OK |
| **DoS por queries pesadas** | No hay paginación en `GET /api/productos` ni `GET /api/pedidos` (pero las tablas son pequeñas). | 🟡 Bajo |

---

## 3. Recomendaciones de mejora

| # | Recomendación | Prioridad | Esfuerzo |
|---|---------------|-----------|----------|
| 1 | **Rate limit específico para `/api/auth/login`** (5 req / 15 min por IP) para mitigar fuerza bruta | 🔴 Crítico | Bajo (5 líneas en `index.ts`) |
| 2 | **Forzar `JWT_SECRET` en producción**: lanzar error si `process.env.NODE_ENV === 'production'` y `!process.env.JWT_SECRET` | 🔴 Crítico | Trivial |
| 3 | **Servir detrás de HTTPS** (Nginx/Caddy con Let's Encrypt) — el backend sigue en HTTP, TLS lo termina el proxy | 🔴 Crítico | Medio |
| 4 | **Hacer cumplir `JWT_SECRET` robusto** (≥32 bytes aleatorios). Documentar en README cómo generarlo: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | 🟠 Alto | Trivial |
| 5 | **Sanitizar `innerHTML` en frontend con `DOMPurify`** antes de renderizar datos del backend (defensa en profundidad contra XSS) | 🟠 Alto | Bajo |
| 6 | **Logging estructurado con `pino`** y redacción automática de `Authorization` y `password` | 🟡 Medio | Bajo |
| 7 | **`npm audit --production` en CI** y arreglo automático con `npm audit fix` (cuidado con breaking changes) | 🟡 Medio | Trivial |
| 8 | **Cabecera CSP estricta** con `helmet.contentSecurityPolicy({ directives: { 'script-src': ["'self'"], ... } })` | 🟡 Medio | Bajo |
| 9 | **Refresh tokens con rotación** y blacklist de jti revocados (actualmente solo se puede revocar la sesión completa) | 🟡 Medio | Alto |
| 10 | **Paginación en `GET /api/productos` y `GET /api/pedidos`** con `?limit=&offset=` (defensa contra datasets grandes) | 🟢 Bajo | Bajo |
| 11 | **Política de contraseñas más estricta** (mínimo 8 chars, 1 mayúscula, 1 número) en `validarCampos` del registro | 🟢 Bajo | Trivial |
| 12 | **Cabecera `Permissions-Policy`** con `helmet.permissionsPolicy({ features: { geolocation: [], camera: [], microphone: [] } })` | 🟢 Bajo | Trivial |
| 13 | **Rotación de logs y rotación de la BD SQLite** (script de backup) | 🟢 Bajo | Bajo |
| 14 | **Pruebas de seguridad automatizadas**: fuerza bruta con `hydra` y OWASP ZAP baseline scan en CI | 🟢 Bajo | Medio |
| 15 | **Verificación de integridad de dependencias**: `npm audit signatures` + `npm config set audit-level high` | 🟢 Bajo | Trivial |

---

## 4. Acciones inmediatas (orden de aplicación)

1. **Agregar rate limit dedicado a `/api/auth`**:
   ```ts
   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 5,
     skipSuccessfulRequests: true,
     message: { success: false, error: 'Demasiados intentos, espera 15 minutos' }
   });
   app.use('/api/auth/login', authLimiter);
   app.use('/api/auth/registro', authLimiter);
   ```
2. **Forzar `JWT_SECRET` en producción** al arrancar.
3. **Servir detrás de Nginx/Caddy con TLS** en deploy.
4. **Agregar `npm audit` a un pipeline CI** (incluso GitHub Actions gratuito).
5. **Sanitizar `innerHTML` del frontend con `DOMPurify`**.

---

**Nota para el alumno:** este documento describe la auditoría del estado real del repositorio
a la fecha. Las marcas ⚠️ y 🟡 son oportunidades de mejora que se atienden en las
recomendaciones de la sección 3. El proyecto cumple los requisitos de seguridad
mínimos de la unidad 2 (autenticación, autorización, validación, transporte seguro
de passwords, defensa contra los vectores OWASP más comunes).
