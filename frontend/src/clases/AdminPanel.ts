import { api, IEstadisticas } from '../servicios/ApiService';
import { IUsuario } from './Sesion';
import { IPedido, EstadoPedido } from './Pedido';
import { Producto } from './Producto';
import { mostrarToast, formatearPrecio } from '../servicios/utilidades';
import { Animador } from './Animador';

export type SubVistaAdmin = 'dashboard' | 'usuarios' | 'pedidos' | 'productos';

export interface IProductoForm {
  id?: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  stock: number;
  rating: number;
}

const ESTADOS_PEDIDO: EstadoPedido[] = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];

export class AdminPanel {
  private _vistaActiva: SubVistaAdmin = 'dashboard';
  private _estadisticas: IEstadisticas | null = null;
  private _usuarios: IUsuario[] = [];
  private _pedidos: IPedido[] = [];
  private _productos: Producto[] = [];
  private _cargando: boolean = false;

  constructor() {
    this.configurarEventosDelegados();
  }

  public get vistaActiva(): SubVistaAdmin { return this._vistaActiva; }

  public mostrar(): void {
    const cont = document.getElementById('seccion-admin');
    if (!cont) return;
    cont.classList.remove('oculto');
    const anim = new Animador(cont);
    anim.fadeIn(400);
    this.cambiarVista('dashboard');
  }

  public ocultar(): void {
    const cont = document.getElementById('seccion-admin');
    if (cont) cont.classList.add('oculto');
  }

  public async cambiarVista(vista: SubVistaAdmin): Promise<void> {
    this._vistaActiva = vista;
    document.querySelectorAll('.admin-tab').forEach(btn => {
      const html = btn as HTMLElement;
      html.classList.toggle('activo', html.dataset.vista === vista);
    });
    const cont = document.getElementById('admin-contenido');
    if (cont) {
      const anim = new Animador(cont);
      anim.fadeIn(200);
    }
    switch (vista) {
      case 'dashboard': await this.cargarDashboard(); break;
      case 'usuarios': await this.cargarUsuarios(); break;
      case 'pedidos': await this.cargarPedidos(); break;
      case 'productos': await this.cargarProductos(); break;
    }
  }

  private configurarEventosDelegados(): void {
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const tab = target.closest('.admin-tab') as HTMLElement | null;
      if (tab && tab.dataset.vista) {
        this.cambiarVista(tab.dataset.vista as SubVistaAdmin);
        return;
      }
      const btnSidebar = target.closest('[data-sidebar-toggle]') as HTMLElement | null;
      if (btnSidebar) {
        document.getElementById('admin-sidebar')?.classList.toggle('colapsado');
      }
    });
  }

  private async cargarDashboard(): Promise<void> {
    const cont = document.getElementById('admin-contenido');
    if (!cont) return;
    cont.innerHTML = '<p class="cargando">Cargando estadisticas...</p>';
    try {
      this._estadisticas = await api.obtenerEstadisticas();
      this.renderizarDashboard();
    } catch (error) {
      cont.innerHTML = `<p class="form-error">${error instanceof Error ? error.message : 'Error'}</p>`;
    }
  }

  private renderizarDashboard(): void {
    const cont = document.getElementById('admin-contenido');
    if (!cont || !this._estadisticas) return;
    const e = this._estadisticas;
    const estados = e.pedidosPorEstado || {};
    const totalEstados = Object.values(estados).reduce((acc, v) => acc + v, 0) || 1;
    cont.innerHTML = `
      <h2 class="admin-subtitulo">Dashboard</h2>
      <div class="dashboard-cards">
        <div class="stat-card stat-usuarios">
          <div class="stat-icono">&#128101;</div>
          <div class="stat-info">
            <div class="stat-valor">${e.totalUsuarios}</div>
            <div class="stat-label">Usuarios</div>
          </div>
        </div>
        <div class="stat-card stat-pedidos">
          <div class="stat-icono">&#128230;</div>
          <div class="stat-info">
            <div class="stat-valor">${e.totalPedidos}</div>
            <div class="stat-label">Pedidos</div>
          </div>
        </div>
        <div class="stat-card stat-ingresos">
          <div class="stat-icono">&#128176;</div>
          <div class="stat-info">
            <div class="stat-valor">${formatearPrecio(e.ingresosTotales)}</div>
            <div class="stat-label">Ingresos</div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-panel">
          <h3>Pedidos por Estado</h3>
          <ul class="estados-lista">
            ${ESTADOS_PEDIDO.map(est => {
              const cantidad = estados[est] || 0;
              const porcentaje = Math.round((cantidad / totalEstados) * 100);
              return `
                <li class="estado-fila">
                  <span class="estado-badge estado-${est}">${est}</span>
                  <div class="estado-barra">
                    <div class="estado-barra-relleno estado-${est}-relleno" style="width:${porcentaje}%"></div>
                  </div>
                  <span class="estado-cantidad">${cantidad}</span>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
        <div class="dashboard-panel">
          <h3>Top 5 Productos mas vendidos</h3>
          <ol class="top-productos-lista">
            ${(e.topProductos || []).slice(0, 5).map((p, idx) => `
              <li class="top-producto-item">
                <span class="top-rank">#${idx + 1}</span>
                <span class="top-nombre">${p.nombre || `Producto #${p.productoId}`}</span>
                <span class="top-cantidad">${p.totalVendidos} vendidos</span>
              </li>
            `).join('') || '<li>Aun no hay datos</li>'}
          </ol>
        </div>
      </div>
    `;
    cont.querySelectorAll('.stat-card').forEach(card => {
      const c = card as HTMLElement;
      c.addEventListener('mouseenter', () => c.classList.add('lift'));
      c.addEventListener('mouseleave', () => c.classList.remove('lift'));
    });
  }

  private async cargarUsuarios(): Promise<void> {
    const cont = document.getElementById('admin-contenido');
    if (!cont) return;
    cont.innerHTML = '<p class="cargando">Cargando usuarios...</p>';
    try {
      this._usuarios = await api.obtenerTodosUsuarios();
      this.renderizarUsuarios();
    } catch (error) {
      cont.innerHTML = `<p class="form-error">${error instanceof Error ? error.message : 'Error'}</p>`;
    }
  }

  private renderizarUsuarios(): void {
    const cont = document.getElementById('admin-contenido');
    if (!cont) return;
    cont.innerHTML = `
      <h2 class="admin-subtitulo">Gestion de Usuarios</h2>
      <div class="tabla-contenedor">
        <table class="tabla-admin tabla-usuarios">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Fecha Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${this._usuarios.map(u => `
              <tr data-usuario-id="${u.id}">
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.email}</td>
                <td>${u.nombreCompleto || '-'}</td>
                <td><span class="rol-badge rol-${(u.rol ?? u.role ?? 'cliente').toString().toLowerCase()}">${u.rol ?? u.role ?? 'cliente'}</span></td>
                <td>${(u as any).fechaRegistro ? new Date((u as any).fechaRegistro).toLocaleDateString('es-MX') : '-'}</td>
                <td>
                  <button class="btn-tabla btn-eliminar" data-eliminar-usuario="${u.id}">Eliminar</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    cont.querySelectorAll('.tabla-usuarios tbody tr').forEach(tr => {
      tr.addEventListener('mouseenter', () => tr.classList.add('fila-hover'));
      tr.addEventListener('mouseleave', () => tr.classList.remove('fila-hover'));
    });
    cont.querySelectorAll('[data-eliminar-usuario]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.eliminarUsuario;
        if (id) this.confirmarEliminarUsuario(id);
      });
    });
  }

  private async confirmarEliminarUsuario(id: string): Promise<void> {
    if (!confirm(`Eliminar usuario #${id}? Esta accion no se puede deshacer.`)) return;
    try {
      await api.eliminarUsuario(id);
      mostrarToast('Usuario eliminado');
      await this.cargarUsuarios();
    } catch (error) {
      mostrarToast(error instanceof Error ? error.message : 'No se pudo eliminar', 3000);
    }
  }

  private async cargarPedidos(): Promise<void> {
    const cont = document.getElementById('admin-contenido');
    if (!cont) return;
    cont.innerHTML = '<p class="cargando">Cargando pedidos...</p>';
    try {
      this._pedidos = await api.obtenerTodosPedidos();
      this.renderizarPedidos();
    } catch (error) {
      cont.innerHTML = `<p class="form-error">${error instanceof Error ? error.message : 'Error'}</p>`;
    }
  }

  private renderizarPedidos(): void {
    const cont = document.getElementById('admin-contenido');
    if (!cont) return;
    cont.innerHTML = `
      <h2 class="admin-subtitulo">Gestion de Pedidos</h2>
      <div class="tabla-contenedor">
        <table class="tabla-admin tabla-pedidos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Direccion</th>
            </tr>
          </thead>
          <tbody>
            ${this._pedidos.map(p => `
              <tr data-pedido-id="${p.id}">
                <td>#${p.id}</td>
                <td>${(p as any).username || (p as any).usuario || '-'}</td>
                <td>${formatearPrecio(p.total)}</td>
                <td>
                  <select class="select-estado" data-pedido-estado="${p.id}" data-original-estado="${p.estado}">
                    ${ESTADOS_PEDIDO.map(est => `
                      <option value="${est}" ${p.estado === est ? 'selected' : ''}>${est}</option>
                    `).join('')}
                  </select>
                </td>
                <td>${p.fecha ? new Date(p.fecha).toLocaleDateString('es-MX') : '-'}</td>
                <td>${p.direccionEnvio ? `${p.direccionEnvio.calle}, ${p.direccionEnvio.ciudad}` : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    cont.querySelectorAll('.tabla-pedidos tbody tr').forEach(tr => {
      tr.addEventListener('mouseenter', () => tr.classList.add('fila-hover'));
      tr.addEventListener('mouseleave', () => tr.classList.remove('fila-hover'));
    });
    cont.querySelectorAll('[data-pedido-estado]').forEach(sel => {
      sel.addEventListener('change', () => this.manejarCambioEstado(sel as HTMLSelectElement));
    });
  }

  private async manejarCambioEstado(select: HTMLSelectElement): Promise<void> {
    const id = select.dataset.pedidoEstado;
    const original = select.dataset.originalEstado;
    const nuevo = select.value;
    if (!id || original === nuevo) return;
    select.disabled = true;
    try {
      await api.actualizarEstadoPedido(id, nuevo);
      select.dataset.originalEstado = nuevo;
      mostrarToast(`Pedido #${id} -> ${nuevo}`);
    } catch (error) {
      select.value = original ?? 'pendiente';
      mostrarToast(error instanceof Error ? error.message : 'No se pudo actualizar', 3000);
    } finally {
      select.disabled = false;
    }
  }

  private async cargarProductos(): Promise<void> {
    const cont = document.getElementById('admin-contenido');
    if (!cont) return;
    cont.innerHTML = '<p class="cargando">Cargando productos...</p>';
    try {
      this._productos = await api.obtenerProductos();
      this.renderizarProductos();
    } catch (error) {
      cont.innerHTML = `<p class="form-error">${error instanceof Error ? error.message : 'Error'}</p>`;
    }
  }

  private renderizarProductos(): void {
    const cont = document.getElementById('admin-contenido');
    if (!cont) return;
    cont.innerHTML = `
      <h2 class="admin-subtitulo">Gestion de Productos</h2>
      <div class="productos-admin-acciones-top">
        <button class="btn-auth btn-primary btn-agregar-producto" id="btn-agregar-producto">+ Agregar producto</button>
      </div>
      <div class="grid-productos-admin">
        ${this._productos.map(p => `
          <div class="producto-admin-card" data-producto-id="${p.id}">
            <img src="${p.imagen}" alt="${p.nombre}" />
            <h4>${p.nombre}</h4>
            <span class="categoria-tag">${p.categoria}</span>
            <p class="precio">${formatearPrecio(p.precio)}</p>
            <p class="stock">Stock: ${p.stock}</p>
            <div class="producto-admin-acciones">
              <button class="btn-tabla btn-editar" data-editar-producto="${p.id}">Editar</button>
              <button class="btn-tabla btn-eliminar" data-eliminar-producto="${p.id}">Eliminar</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    cont.querySelectorAll('.producto-admin-card').forEach(card => {
      const c = card as HTMLElement;
      c.addEventListener('mouseenter', () => c.classList.add('lift'));
      c.addEventListener('mouseleave', () => c.classList.remove('lift'));
    });
    const btnAgregar = document.getElementById('btn-agregar-producto');
    if (btnAgregar) btnAgregar.addEventListener('click', () => this.mostrarFormularioProducto());
    cont.querySelectorAll('[data-editar-producto]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt((btn as HTMLElement).dataset.editarProducto || '0', 10);
        const prod = this._productos.find(p => p.id === id);
        if (prod) this.mostrarFormularioProducto(prod);
      });
    });
    cont.querySelectorAll('[data-eliminar-producto]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.eliminarProducto;
        if (id) this.confirmarEliminarProducto(id);
      });
    });
  }

  private confirmarEliminarProducto(id: string): void {
    const prod = this._productos.find(p => String(p.id) === id);
    if (!prod) return;
    if (!confirm(`Eliminar producto "${prod.nombre}"?`)) return;
    this.eliminarProducto(id);
  }

  private async eliminarProducto(id: string): Promise<void> {
    try {
      await api.eliminarProducto(id);
      mostrarToast('Producto eliminado');
      await this.cargarProductos();
    } catch (error) {
      mostrarToast(error instanceof Error ? error.message : 'No se pudo eliminar', 3000);
    }
  }

  private mostrarFormularioProducto(producto?: Producto): void {
    const form = document.getElementById('form-producto');
    if (!form) return;
    (form as HTMLFormElement).reset();
    const titulo = document.getElementById('form-producto-titulo');
    const idInput = document.getElementById('prod-id') as HTMLInputElement | null;
    if (titulo) titulo.textContent = producto ? `Editar: ${producto.nombre}` : 'Nuevo producto';
    if (idInput) idInput.value = producto ? String(producto.id) : '';
    if (producto) {
      (document.getElementById('prod-nombre') as HTMLInputElement).value = producto.nombre;
      (document.getElementById('prod-descripcion') as HTMLTextAreaElement).value = producto.descripcion;
      (document.getElementById('prod-precio') as HTMLInputElement).value = String(producto.precio);
      (document.getElementById('prod-categoria') as HTMLInputElement).value = producto.categoria;
      (document.getElementById('prod-imagen') as HTMLInputElement).value = producto.imagen;
      (document.getElementById('prod-stock') as HTMLInputElement).value = String(producto.stock);
      (document.getElementById('prod-rating') as HTMLInputElement).value = String(producto.rating);
    }
    const modal = document.getElementById('modal-producto');
    if (modal) {
      modal.classList.remove('oculto');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  public async guardarProducto(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const idStr = (document.getElementById('prod-id') as HTMLInputElement).value;
    const payload = {
      nombre: (document.getElementById('prod-nombre') as HTMLInputElement).value.trim(),
      descripcion: (document.getElementById('prod-descripcion') as HTMLTextAreaElement).value.trim(),
      precio: parseFloat((document.getElementById('prod-precio') as HTMLInputElement).value),
      categoria: (document.getElementById('prod-categoria') as HTMLInputElement).value.trim(),
      imagen: (document.getElementById('prod-imagen') as HTMLInputElement).value.trim(),
      stock: parseInt((document.getElementById('prod-stock') as HTMLInputElement).value, 10),
      rating: parseFloat((document.getElementById('prod-rating') as HTMLInputElement).value || '0')
    };
    if (!payload.nombre || !payload.categoria || isNaN(payload.precio) || isNaN(payload.stock)) {
      mostrarToast('Completa los campos requeridos', 2500);
      return;
    }
    const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try {
      if (idStr) {
        await api.actualizarProducto(idStr, payload);
        mostrarToast('Producto actualizado');
      } else {
        await api.crearProducto(payload);
        mostrarToast('Producto creado');
      }
      const modal = document.getElementById('modal-producto');
      if (modal) {
        modal.classList.add('oculto');
        modal.setAttribute('aria-hidden', 'true');
      }
      await this.cargarProductos();
    } catch (error) {
      mostrarToast(error instanceof Error ? error.message : 'No se pudo guardar', 3000);
    } finally {
      if (btn) btn.disabled = false;
    }
  }
}
