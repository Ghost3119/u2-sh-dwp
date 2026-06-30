# Guia de capturas de pantalla

Para que las capturas salgan bien:
1. Levanta el proyecto: `npm run dev` desde la raiz
2. Abre Chrome en `http://localhost:5173`
3. Usa la herramienta de recorte de Windows (Win+Shift+S) o la extension FireShot
4. Tamano recomendado: 1920x1080

## Capturas requeridas (15 total):

### 01-landing-publica.png
- Estado: Sin sesion iniciada
- Mostrar: pagina principal con todos los productos
- Pasos: Abrir la app por primera vez o en ventana incognito

### 02-modal-login.png
- Estado: Click en "Iniciar sesion"
- Mostrar: modal de login abierto sobre el fondo
- Pasos: Click en "Iniciar sesion" en el header

### 03-modal-registro.png
- Estado: Click en "Registrarse"
- Mostrar: modal de registro con todos los campos
- Pasos: Click en "Registrarse" en el header

### 04-login-exitoso.png
- Estado: Sesion iniciada como demo
- Mostrar: header con "demo" y boton "Cerrar sesion"
- Pasos: Login con demo/demo123

### 05-grid-productos.png
- Estado: Catalogo cargado
- Mostrar: grid con los 12 productos
- Pasos: Scroll a la seccion de productos

### 06-hover-producto.png
- Estado: Mouse sobre una card
- Mostrar: card con efecto hover (levantada)
- Pasos: Mover mouse sobre una card de producto

### 07-detalle-producto.png
- Estado: Panel de detalle abierto
- Mostrar: info del producto, descripcion, precio
- Pasos: Click derecho sobre una card O click en algun boton de detalle

### 08-carrito-con-items.png
- Estado: Carrito con 2-3 productos
- Mostrar: panel de carrito con productos agregados
- Pasos: Agregar varios productos con "Agregar al carrito"

### 09-checkout-formulario.png
- Estado: Modal de checkout abierto
- Mostrar: form de direccion de envio
- Pasos: Click en "Finalizar compra" con sesion iniciada

### 10-pedido-confirmado.png
- Estado: Pedido recien confirmado
- Mostrar: animacion de exito con check
- Pasos: Llenar checkout y confirmar

### 11-mis-pedidos.png
- Estado: Seccion "Mis Pedidos"
- Mostrar: lista de pedidos del usuario
- Pasos: Click en "Mis Pedidos" en el header

### 12-detalle-pedido.png
- Estado: Modal de detalle de pedido
- Mostrar: items del pedido, total, direccion
- Pasos: Click en una card de pedido

### 13-devtools-network.png
- Estado: DevTools abierto
- Mostrar: pestana Network con llamadas a /api/productos y /api/auth/me
- Pasos: F12 -> Network -> Refresh

### 14-devtools-console.png
- Estado: DevTools abierto
- Mostrar: console sin errores, con logs de las clases
- Pasos: F12 -> Console

### 15-estructura-poo.png
- Estado: VS Code abierto
- Mostrar: arbol de archivos del proyecto
- Pasos: Abrir VS Code en la carpeta u2-sh-dwp
