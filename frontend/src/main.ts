import { Producto } from './clases/Producto';
import { Carrito } from './clases/Carrito';
import { Animador } from './clases/Animador';
import { Sesion } from './clases/Sesion';
import { AuthService } from './clases/AuthService';
import { Checkout, IDireccionEnvio } from './clases/Checkout';
import { Pedido, IPedido } from './clases/Pedido';
import { api, setTokenGlobal, setManejadorNoAutorizado } from './servicios/ApiService';
import { formatearPrecio, generarEstrellas, debounce, mostrarToast } from './servicios/utilidades';

class App {
  private carrito: Carrito = new Carrito();
  private productos: Producto[] = [];
  private productosFiltrados: Producto[] = [];
  private categoriaActiva: string = 'Todas';
  private terminoBusqueda: string = '';
  private sesion: Sesion = new Sesion();
  private authService: AuthService = new AuthService(this.sesion);
  private checkoutService: Checkout = new Checkout(this.sesion);
  private pedidos: IPedido[] = [];

  constructor() {
    this.inicializar();
  }

  private async inicializar(): Promise<void> {
    setTokenGlobal(this.sesion.obtenerToken());
    setManejadorNoAutorizado(() => this.manejarNoAutorizado());

    this.configurarCursorTrail();
    this.configurarEventosMouse();
    this.configurarDragDrop();
    this.configurarParallax();
    this.configurarHeader();
    this.configurarModales();
    this.configurarFormulariosAuth();
    this.configurarCheckout();

    await this.validarSesionInicial();
    await this.cargarDatos();
    this.configurarBuscador();
    this.actualizarUIAuth();
  }

  private async validarSesionInicial(): Promise<void> {
    if (this.sesion.estaAutenticada()) {
      try {
        const perfil = await this.authService.obtenerPerfil();
        if (perfil) {
          setTokenGlobal(this.sesion.obtenerToken());
        } else {
          setTokenGlobal(null);
        }
      } catch (error) {
        console.warn('Sesion invalida, limpiando');
        this.sesion.cerrar();
        setTokenGlobal(null);
      }
    }
  }

  private manejarNoAutorizado(): void {
    this.sesion.cerrar();
    setTokenGlobal(null);
    this.actualizarUIAuth();
    mostrarToast('Sesion expirada, inicia sesion de nuevo');
  }

  private configurarCursorTrail(): void {
    const trail = document.getElementById('cursor-trail');
    if (!trail) return;
    document.addEventListener('mousemove', (e: MouseEvent) => {
      trail.style.left = e.clientX + 'px';
      trail.style.top = e.clientY + 'px';
    });
  }

  private configurarEventosMouse(): void {
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('mouseover', () => {
        const anim = new Animador(logo as HTMLElement);
        anim.bounce();
      });
    }

    const carritoIcono = document.getElementById('carrito-icono');
    if (carritoIcono) {
      carritoIcono.addEventListener('click', () => this.togglePanelCarrito());
      carritoIcono.addEventListener('mouseover', () => {
        const anim = new Animador(carritoIcono);
        anim.bounce();
      });
    }

    const btnCerrarDetalle = document.getElementById('btn-cerrar-detalle');
    if (btnCerrarDetalle) {
      btnCerrarDetalle.addEventListener('click', () => this.cerrarPanelDetalle());
    }

    const btnCerrarCarrito = document.getElementById('btn-cerrar-carrito');
    if (btnCerrarCarrito) {
      btnCerrarCarrito.addEventListener('click', () => this.cerrarPanelCarrito());
    }

    document.addEventListener('contextmenu', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.producto-card') as HTMLElement | null;
      if (card) {
        e.preventDefault();
        const id = parseInt(card.dataset.id || '0', 10);
        const producto = this.productos.find(p => p.id === id);
        if (producto) this.mostrarDetalle(producto);
      }
    });
  }

  private configurarDragDrop(): void {
    const zona = document.getElementById('zona-drag');
    if (!zona) return;

    zona.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      zona.classList.add('hover');
    });

    zona.addEventListener('dragleave', () => zona.classList.remove('hover'));

    zona.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      zona.classList.remove('hover');
      const productoId = e.dataTransfer?.getData('text/plain');
      if (productoId) {
        const producto = this.productos.find(p => p.id === parseInt(productoId, 10));
        if (producto) {
          this.toggleFavorito(producto.id);
          mostrarToast(`${producto.nombre} agregado a favoritos`);
          const anim = new Animador(zona);
          anim.bounce();
        }
      }
    });
  }

  private configurarParallax(): void {
    const header = document.getElementById('header-principal');
    if (!header) return;
    header.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = header.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      header.style.backgroundPosition = `${x * 12}px ${y * 8}px`;
    });
  }

  private configurarHeader(): void {
    const btnLogin = document.getElementById('btn-abrir-login');
    if (btnLogin) btnLogin.addEventListener('click', () => this.abrirModal('modal-login'));

    const btnRegistro = document.getElementById('btn-abrir-registro');
    if (btnRegistro) btnRegistro.addEventListener('click', () => this.abrirModal('modal-registro'));

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', () => this.cerrarSesion());

    const btnMisPedidos = document.getElementById('btn-mis-pedidos');
    if (btnMisPedidos) btnMisPedidos.addEventListener('click', () => this.mostrarSeccionPedidos());
  }

  private configurarModales(): void {
    document.querySelectorAll('[data-cerrar-modal]').forEach(el => {
      el.addEventListener('click', (e: Event) => {
        const id = (e.currentTarget as HTMLElement).dataset.cerrarModal;
        if (id) this.cerrarModal(id);
      });
    });

    document.querySelectorAll('.modal-contenido').forEach(el => {
      el.addEventListener('mouseenter', () => {
        el.classList.add('hover');
      });
      el.addEventListener('mouseleave', () => {
        el.classList.remove('hover');
      });
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not(.oculto)').forEach(m => this.cerrarModal(m.id));
      }
    });
  }

  private configurarFormulariosAuth(): void {
    const formLogin = document.getElementById('form-login') as HTMLFormElement | null;
    if (formLogin) {
      formLogin.addEventListener('submit', (e: Event) => this.handleLogin(e));
    }

    const formRegistro = document.getElementById('form-registro') as HTMLFormElement | null;
    if (formRegistro) {
      formRegistro.addEventListener('submit', (e: Event) => this.handleRegistro(e));
    }

    const linkIrRegistro = document.getElementById('link-ir-registro');
    if (linkIrRegistro) {
      linkIrRegistro.addEventListener('click', (e: Event) => {
        e.preventDefault();
        this.cerrarModal('modal-login');
        setTimeout(() => this.abrirModal('modal-registro'), 200);
      });
    }

    const linkIrLogin = document.getElementById('link-ir-login');
    if (linkIrLogin) {
      linkIrLogin.addEventListener('click', (e: Event) => {
        e.preventDefault();
        this.cerrarModal('modal-registro');
        setTimeout(() => this.abrirModal('modal-login'), 200);
      });
    }
  }

  private configurarCheckout(): void {
    const formCheckout = document.getElementById('form-checkout') as HTMLFormElement | null;
    if (formCheckout) {
      formCheckout.addEventListener('submit', (e: Event) => this.handleCheckout(e));
    }
  }

  private async handleLogin(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
      this.mostrarErrorForm(form, errorEl, 'Completa todos los campos');
      return;
    }

    try {
      await this.authService.login(username, password);
      setTokenGlobal(this.sesion.obtenerToken());
      this.actualizarUIAuth();
      this.cerrarModal('modal-login');
      form.reset();
      if (errorEl) errorEl.textContent = '';
      mostrarToast(`Bienvenido ${this.sesion.obtenerUsuario()?.username}`);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al iniciar sesion';
      this.mostrarErrorForm(form, errorEl, mensaje);
    }
  }

  private async handleRegistro(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const nombreCompleto = (form.elements.namedItem('nombreCompleto') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const errorEl = document.getElementById('registro-error');

    const validacion = this.validarFormularioRegistro({ username, email, nombreCompleto, password });
    if (!validacion.valido) {
      this.mostrarErrorForm(form, errorEl, validacion.errores[0] || 'Datos invalidos');
      return;
    }

    try {
      await this.authService.registrar({ username, email, nombreCompleto, password });
      setTokenGlobal(this.sesion.obtenerToken());
      this.actualizarUIAuth();
      this.cerrarModal('modal-registro');
      form.reset();
      if (errorEl) errorEl.textContent = '';
      mostrarToast('Cuenta creada con exito');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al registrar';
      this.mostrarErrorForm(form, errorEl, mensaje);
    }
  }

  private validarFormularioRegistro(datos: { username: string; email: string; nombreCompleto: string; password: string }): { valido: boolean; errores: string[] } {
    const errores: string[] = [];
    if (datos.username.length < 3) errores.push('El usuario debe tener al menos 3 caracteres');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) errores.push('Email no valido');
    if (datos.nombreCompleto.length < 2) errores.push('Nombre completo requerido');
    if (datos.password.length < 6) errores.push('La contrasena debe tener al menos 6 caracteres');
    return { valido: errores.length === 0, errores };
  }

  private mostrarErrorForm(form: HTMLElement, errorEl: HTMLElement | null, mensaje: string): void {
    if (errorEl) errorEl.textContent = mensaje;
    form.classList.add('shake-form');
    setTimeout(() => form.classList.remove('shake-form'), 450);
  }

  private async cerrarSesion(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      console.warn('Error en logout');
    } finally {
      setTokenGlobal(null);
      this.actualizarUIAuth();
      this.pedidos = [];
      const sec = document.getElementById('seccion-pedidos');
      if (sec) sec.classList.add('oculto');
      mostrarToast('Sesion cerrada');
    }
  }

  private actualizarUIAuth(): void {
    const contAuth = document.getElementById('auth-contenedor');
    const contUser = document.getElementById('usuario-contenedor');
    const nombreEl = document.getElementById('usuario-nombre');

    if (this.sesion.estaAutenticada()) {
      contAuth?.classList.add('oculto');
      contUser?.classList.remove('oculto');
      const u = this.sesion.obtenerUsuario();
      if (u && nombreEl) {
        nombreEl.textContent = u.nombreCompleto || u.username;
      }
    } else {
      contAuth?.classList.remove('oculto');
      contUser?.classList.add('oculto');
    }
  }

  private async cargarDatos(): Promise<void> {
    try {
      const [productos, categorias] = await Promise.all([
        api.obtenerProductos(),
        api.obtenerCategorias()
      ]);
      this.productos = productos;
      this.productosFiltrados = productos;
      this.renderizarFiltros(['Todas', ...categorias]);
      this.renderizarProductos();

      if (this.sesion.estaAutenticada()) {
        await this.cargarPedidos();
      }
    } catch (error) {
      const grid = document.getElementById('grid-productos');
      if (grid) {
        grid.innerHTML = `<p class="cargando">Error al cargar productos. Verifica que el backend este corriendo en puerto 4000.</p>`;
      }
    }
  }

  private async cargarPedidos(): Promise<void> {
    try {
      const pedidos = await api.obtenerPedidos();
      this.pedidos = pedidos;
    } catch (error) {
      console.warn('No se pudieron cargar pedidos');
      this.pedidos = [];
    }
  }

  private configurarBuscador(): void {
    const buscador = document.getElementById('buscador');
    if (!buscador) return;
    const busquedaDebounced = debounce((valor: string) => {
      this.terminoBusqueda = valor;
      this.aplicarFiltros();
    }, 300);
    buscador.addEventListener('input', (e: Event) => {
      busquedaDebounced((e.target as HTMLInputElement).value);
    });
  }

  private renderizarFiltros(categorias: string[]): void {
    const cont = document.getElementById('filtros-categorias');
    if (!cont) return;
    cont.innerHTML = '';
    categorias.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filtro-btn' + (cat === this.categoriaActiva ? ' activo' : '');
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        this.categoriaActiva = cat;
        this.aplicarFiltros();
        document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');
      });
      cont.appendChild(btn);
    });
  }

  private aplicarFiltros(): void {
    let resultado = this.productos;
    if (this.categoriaActiva !== 'Todas') {
      resultado = resultado.filter(p => p.categoria === this.categoriaActiva);
    }
    if (this.terminoBusqueda.trim().length > 0) {
      const t = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(p =>
        p.nombre.toLowerCase().includes(t) ||
        p.descripcion.toLowerCase().includes(t) ||
        p.categoria.toLowerCase().includes(t)
      );
    }
    this.productosFiltrados = resultado;
    this.renderizarProductos();
  }

  private renderizarProductos(): void {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;
    grid.innerHTML = '';

    if (this.productosFiltrados.length === 0) {
      grid.innerHTML = '<p class="cargando">No se encontraron productos.</p>';
      return;
    }

    this.productosFiltrados.forEach((producto, idx) => {
      const card = document.createElement('div');
      card.className = 'producto-card';
      card.dataset.id = String(producto.id);
      card.draggable = true;
      card.style.animationDelay = `${idx * 0.05}s`;

      card.innerHTML = `
        <button class="btn-favorito ${this.carrito.esFavorito(producto.id) ? 'activo' : ''}" data-fav="${producto.id}">
          ${this.carrito.esFavorito(producto.id) ? '❤' : '♡'}
        </button>
        <img src="${producto.imagen}" alt="${producto.nombre}" loading="lazy" />
        <span class="categoria-tag">${producto.categoria}</span>
        <h3>${producto.nombre}</h3>
        <div class="rating">${generarEstrellas(producto.rating)} (${producto.rating})</div>
        <p class="precio">${formatearPrecio(producto.precio)}</p>
        <button class="btn-agregar" data-add="${producto.id}">Agregar al carrito</button>
      `;

      card.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('btn-favorito')) {
          e.stopPropagation();
          this.toggleFavorito(producto.id);
          return;
        }
        if (target.classList.contains('btn-agregar')) {
          e.stopPropagation();
          this.agregarAlCarrito(producto);
          return;
        }
        this.mostrarDetalle(producto);
      });

      card.addEventListener('mouseover', () => {
        card.style.transition = 'transform .3s ease';
      });

      card.addEventListener('dblclick', () => {
        this.agregarAlCarrito(producto);
      });

      card.addEventListener('dragstart', (e: DragEvent) => {
        e.dataTransfer?.setData('text/plain', String(producto.id));
        card.style.opacity = '0.5';
      });

      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
      });

      grid.appendChild(card);
    });
  }

  private async mostrarDetalle(producto: Producto): Promise<void> {
    const panel = document.getElementById('panel-detalle');
    const cont = document.getElementById('detalle-contenido');
    if (!panel || !cont) return;

    let detalleCompleto = producto;
    try {
      const fetched = await api.obtenerProductoPorId(producto.id);
      if (fetched) detalleCompleto = fetched;
    } catch (error) {
      console.error('No se pudo obtener detalle del backend, usando datos locales');
    }

    cont.innerHTML = `
      <img src="${detalleCompleto.imagen}" alt="${detalleCompleto.nombre}" />
      <h2>${detalleCompleto.nombre}</h2>
      <span class="categoria-tag">${detalleCompleto.categoria}</span>
      <p style="margin:1rem 0; line-height:1.6">${detalleCompleto.descripcion}</p>
      <p class="rating">${generarEstrellas(detalleCompleto.rating)} (${detalleCompleto.rating})</p>
      <p class="precio">${formatearPrecio(detalleCompleto.precio)}</p>
      <p>Stock disponible: ${detalleCompleto.stock}</p>
      <button class="btn-agregar" id="btn-add-detalle">Agregar al carrito</button>
    `;

    panel.classList.remove('oculto');
    panel.classList.add('visible');
    const anim = new Animador(panel);
    anim.slideIn('right', 400);

    const btnAdd = document.getElementById('btn-add-detalle');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        this.agregarAlCarrito(detalleCompleto);
      });
    }
  }

  private cerrarPanelDetalle(): void {
    const panel = document.getElementById('panel-detalle');
    if (!panel) return;
    panel.classList.remove('visible');
    setTimeout(() => panel.classList.add('oculto'), 400);
  }

  private cerrarPanelCarrito(): void {
    const panel = document.getElementById('panel-carrito');
    if (!panel) return;
    panel.classList.remove('visible');
    setTimeout(() => panel.classList.add('oculto'), 400);
  }

  private togglePanelCarrito(): void {
    const panel = document.getElementById('panel-carrito');
    if (!panel) return;
    if (panel.classList.contains('visible')) {
      this.cerrarPanelCarrito();
    } else {
      this.renderizarCarrito();
      panel.classList.remove('oculto');
      panel.classList.add('visible');
    }
  }

  private async agregarAlCarrito(producto: Producto): Promise<void> {
    this.carrito.agregarProducto(producto, 1);
    this.actualizarContador();
    mostrarToast(`"${producto.nombre}" agregado al carrito`);
    try {
      await api.agregarAlCarrito(producto.id, 1);
    } catch (error) {
      console.warn('No se pudo sincronizar con backend, carrito local activo');
    }
  }

  private toggleFavorito(id: number): void {
    const esFav = this.carrito.toggleFavorito(id);
    mostrarToast(esFav ? 'Agregado a favoritos ❤' : 'Quitado de favoritos');
    this.renderizarProductos();
  }

  private actualizarContador(): void {
    const contador = document.getElementById('carrito-contador');
    if (contador) contador.textContent = String(this.carrito.cantidadTotal);
  }

  private renderizarCarrito(): void {
    const cont = document.getElementById('carrito-contenido');
    if (!cont) return;
    if (this.carrito.items.length === 0) {
      cont.innerHTML = '<p>Tu carrito esta vacio</p>';
      return;
    }
    const autenticado = this.sesion.estaAutenticada();
    cont.innerHTML = `
      ${this.carrito.items.map(item => `
        <div class="carrito-item">
          <img src="${item.producto.imagen}" alt="${item.producto.nombre}" />
          <div class="info">
            <h4>${item.producto.nombre}</h4>
            <p>${formatearPrecio(item.producto.precio)} x ${item.cantidad}</p>
          </div>
          <button class="btn-cerrar" data-remove="${item.producto.id}" style="font-size:1.2rem">&times;</button>
        </div>
      `).join('')}
      <hr style="margin:1rem 0; border-color:rgba(255,255,255,.1)" />
      <h3 style="color:#feca57">Total: ${formatearPrecio(this.carrito.total)}</h3>
      <div style="display:flex; gap:.5rem; flex-wrap:wrap">
        <button class="btn-agregar" id="btn-vaciar" style="flex:1">Vaciar carrito</button>
        <button class="btn-agregar" id="btn-finalizar" style="flex:1; background:linear-gradient(45deg,#2ecc71,#27ae60); color:#fff">
          ${autenticado ? 'Finalizar compra' : 'Inicia sesion para comprar'}
        </button>
      </div>
    `;

    cont.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt((btn as HTMLElement).dataset.remove || '0', 10);
        this.carrito.eliminarProducto(id);
        this.actualizarContador();
        this.renderizarCarrito();
      });
    });

    const btnVaciar = document.getElementById('btn-vaciar');
    if (btnVaciar) {
      btnVaciar.addEventListener('click', () => {
        this.carrito.vaciar();
        this.actualizarContador();
        this.renderizarCarrito();
        mostrarToast('Carrito vaciado');
      });
    }

    const btnFinalizar = document.getElementById('btn-finalizar');
    if (btnFinalizar) {
      btnFinalizar.addEventListener('click', () => this.iniciarCheckout());
    }
  }

  private iniciarCheckout(): void {
    if (!this.sesion.estaAutenticada()) {
      this.cerrarPanelCarrito();
      this.abrirModal('modal-login');
      mostrarToast('Inicia sesion para finalizar la compra');
      return;
    }
    if (this.carrito.items.length === 0) {
      mostrarToast('Tu carrito esta vacio');
      return;
    }
    this.renderizarResumenCheckout();
    this.abrirModal('modal-checkout');
  }

  private renderizarResumenCheckout(): void {
    const cont = document.getElementById('checkout-resumen');
    if (!cont) return;
    cont.innerHTML = this.carrito.items.map(item => `
      <div class="resumen-item">
        <span>${item.producto.nombre} x${item.cantidad}</span>
        <span>${formatearPrecio(item.producto.precio * item.cantidad)}</span>
      </div>
    `).join('') + `
      <div class="resumen-total">
        <span>Total</span>
        <span>${formatearPrecio(this.carrito.total)}</span>
      </div>
    `;
  }

  private async handleCheckout(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const errorEl = document.getElementById('checkout-error');
    if (errorEl) errorEl.textContent = '';

    const direccion: IDireccionEnvio = {
      calle: (form.elements.namedItem('calle') as HTMLInputElement).value.trim(),
      ciudad: (form.elements.namedItem('ciudad') as HTMLInputElement).value.trim(),
      estado: (form.elements.namedItem('estado') as HTMLInputElement).value.trim(),
      codigoPostal: (form.elements.namedItem('codigoPostal') as HTMLInputElement).value.trim(),
      telefono: (form.elements.namedItem('telefono') as HTMLInputElement).value.trim() || undefined,
      referencias: (form.elements.namedItem('referencias') as HTMLTextAreaElement).value.trim() || undefined
    };

    try {
      const pedido = await this.checkoutService.confirmar(this.carrito.items, direccion);
      this.mostrarExitoCheckout();
      this.carrito.vaciar();
      this.actualizarContador();
      await this.cargarPedidos();
      form.reset();
      this.pedidos = [pedido, ...this.pedidos];
      setTimeout(() => {
        this.cerrarModal('modal-checkout');
        this.mostrarSeccionPedidos();
      }, 2200);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al procesar pedido';
      if (errorEl) errorEl.textContent = mensaje;
      form.classList.add('shake-form');
      setTimeout(() => form.classList.remove('shake-form'), 450);
    }
  }

  private mostrarExitoCheckout(): void {
    const form = document.getElementById('form-checkout');
    const exito = document.getElementById('checkout-exito');
    if (form) form.classList.add('oculto');
    if (exito) exito.classList.remove('oculto');
  }

  private mostrarSeccionPedidos(): void {
    const sec = document.getElementById('seccion-pedidos');
    if (!sec) return;
    sec.classList.remove('oculto');
    this.renderizarPedidos();
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private renderizarPedidos(): void {
    const cont = document.getElementById('pedidos-contenido');
    if (!cont) return;

    if (this.pedidos.length === 0) {
      cont.innerHTML = '<p class="cargando">Aun no tienes pedidos</p>';
      return;
    }

    cont.innerHTML = this.pedidos.map(p => {
      const pedido = new Pedido(p.id, p.items, p.total, p.estado, p.fecha, p.direccionEnvio);
      const estadoClass = `estado-${(p.estado as string).toLowerCase()}`;
      return `
        <div class="pedido-card" data-pedido-id="${p.id}">
          <h4>Pedido #${p.id}</h4>
          <div class="pedido-fecha">${pedido.fechaFormateada}</div>
          <span class="estado-badge ${estadoClass}">${pedido.estadoLegible}</span>
          <p class="pedido-total">${pedido.totalFormateado}</p>
          <p style="font-size:.85rem;color:#aaa;margin-top:.4rem">${pedido.cantidadItems} articulo(s)</p>
        </div>
      `;
    }).join('');

    cont.querySelectorAll('.pedido-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.pedidoId;
        const pedido = this.pedidos.find(p => String(p.id) === id);
        if (pedido) this.mostrarDetallePedido(pedido);
      });
    });
  }

  private mostrarDetallePedido(pedido: IPedido): void {
    const cont = document.getElementById('detalle-pedido-contenido');
    if (!cont) return;
    const p = new Pedido(pedido.id, pedido.items, pedido.total, pedido.estado, pedido.fecha, pedido.direccionEnvio);
    const estadoClass = `estado-${(pedido.estado as string).toLowerCase()}`;
    cont.innerHTML = `
      <h2 style="color:#feca57">Pedido #${p.id}</h2>
      <p style="color:#aaa; margin-bottom:.5rem">${p.fechaFormateada}</p>
      <span class="estado-badge ${estadoClass}">${p.estadoLegible}</span>
      <div class="detalle-pedido-lista">
        ${p.items.map(i => `
          <div class="detalle-pedido-item">
            <span>${i.nombre || `Producto #${i.productoId}`} x${i.cantidad}</span>
            <span>${formatearPrecio((i.subtotal ?? i.precioUnitario * i.cantidad))}</span>
          </div>
        `).join('')}
      </div>
      <h3 style="color:#feca57;text-align:right">${p.totalFormateado}</h3>
      ${p.direccionEnvio ? `
        <h3 class="subtitulo">Direccion de envio</h3>
        <p style="font-size:.9rem;color:#d0d0d0;line-height:1.6">
          ${p.direccionEnvio.calle}<br>
          ${p.direccionEnvio.ciudad}, ${p.direccionEnvio.estado} ${p.direccionEnvio.codigoPostal}<br>
          ${p.direccionEnvio.pais || 'Mexico'}
        </p>
      ` : ''}
    `;
    this.abrirModal('modal-detalle-pedido');
  }

  private abrirModal(id: string): void {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('oculto');
    modal.setAttribute('aria-hidden', 'false');
    const cont = modal.querySelector('.modal-contenido') as HTMLElement | null;
    if (cont) {
      const anim = new Animador(cont);
      anim.fadeIn(300);
    }
  }

  private cerrarModal(id: string): void {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('cerrando');
    setTimeout(() => {
      modal.classList.add('oculto');
      modal.classList.remove('cerrando');
      modal.setAttribute('aria-hidden', 'true');
      if (id === 'modal-checkout') {
        const exito = document.getElementById('checkout-exito');
        const form = document.getElementById('form-checkout');
        if (exito) exito.classList.add('oculto');
        if (form) form.classList.remove('oculto');
      }
    }, 250);
  }
}

new App();
