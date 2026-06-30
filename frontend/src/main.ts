import { Producto } from './clases/Producto';
import { Carrito } from './clases/Carrito';
import { Animador } from './clases/Animador';
import { api, ApiService } from './servicios/ApiService';
import { formatearPrecio, generarEstrellas, debounce, mostrarToast } from './servicios/utilidades';

class App {
  private carrito: Carrito = new Carrito();
  private productos: Producto[] = [];
  private productosFiltrados: Producto[] = [];
  private categoriaActiva: string = 'Todas';
  private terminoBusqueda: string = '';

  constructor() {
    this.inicializar();
  }

  private async inicializar(): Promise<void> {
    this.configurarCursorTrail();
    this.configurarEventosMouse();
    this.configurarDragDrop();
    this.configurarParallax();
    await this.cargarDatos();
    this.configurarBuscador();
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
    } catch (error) {
      const grid = document.getElementById('grid-productos');
      if (grid) {
        grid.innerHTML = `<p class="cargando">Error al cargar productos. Verifica que el backend este corriendo en puerto 4000.</p>`;
      }
    }
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
      if (target.classList && target.classList.contains('producto-card')) {
        e.preventDefault();
        const id = parseInt(target.dataset.id || '0', 10);
        if (id) this.toggleFavorito(id);
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
    const hero = document.getElementById('hero');
    if (!hero) return;
    hero.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      hero.style.backgroundPosition = `${x * 30}px ${y * 30}px`;
    });
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
        this.toggleFavorito(producto.id);
        const anim = new Animador(card);
        anim.bounce();
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
      <button class="btn-agregar" id="btn-vaciar">Vaciar carrito</button>
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
  }
}

new App();
