import { Producto } from '../clases/Producto';
import { ILoginDatos, ILoginRespuesta, IRegistroDatos } from '../clases/AuthService';
import { IUsuario, Rol } from '../clases/Sesion';
import { IPedido, IPedidoItem, IDireccionEnvioSnapshot, EstadoPedido } from '../clases/Pedido';

const API_BASE = 'http://localhost:4000/api';

let _tokenActual: string | null = null;
let _manejadorNoAutorizado: (() => void) | null = null;

export function setTokenGlobal(token: string | null): void {
  _tokenActual = token;
}

export function setManejadorNoAutorizado(manejador: () => void): void {
  _manejadorNoAutorizado = manejador;
}

export interface ISesionRemota {
  id: number | string;
  dispositivo?: string;
  userAgent?: string;
  ip?: string;
  fechaCreacion?: string;
  createdAt?: string;
  actual?: boolean;
  esActual?: boolean;
}

export interface IProductoPayload {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  stock: number;
  rating?: number;
}

export interface IRecuperacionRespuesta {
  mensaje?: string;
  token?: string;
  resetToken?: string;
  expiraEn?: number;
}

export interface IEstadisticas {
  totalUsuarios: number;
  totalPedidos: number;
  ingresosTotales: number;
  pedidosPorEstado: Record<EstadoPedido | string, number>;
  topProductos: { productoId: number; nombre?: string; totalVendidos: number; ingresos: number }[];
}

export class ApiService {
  private _baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this._baseUrl = baseUrl;
  }

  public get baseUrl(): string { return this._baseUrl; }

  private headers(conAuth: boolean = false, extra: Record<string, string> = {}): Record<string, string> {
    const base: Record<string, string> = { 'Content-Type': 'application/json' };
    if (conAuth && _tokenActual) {
      base['Authorization'] = `Bearer ${_tokenActual}`;
    }
    return { ...base, ...extra };
  }

  private async manejarRespuesta<T>(respuesta: Response): Promise<T> {
    if (respuesta.status === 401) {
      _tokenActual = null;
      if (_manejadorNoAutorizado) _manejadorNoAutorizado();
      throw new Error('No autorizado');
    }
    if (respuesta.status === 403) {
      throw new Error('Acceso denegado: se requiere rol de administrador');
    }
    if (!respuesta.ok) {
      let mensaje = `HTTP error: ${respuesta.status}`;
      try {
        const cuerpo = await respuesta.json();
        if (cuerpo && (cuerpo.error || cuerpo.message)) {
          mensaje = cuerpo.error || cuerpo.message;
        }
      } catch {
      }
      throw new Error(mensaje);
    }
    const json = await respuesta.json();
    if (json && json.success === false) {
      throw new Error(json.error || 'Error desconocido');
    }
    return json as T;
  }

  private extraerDato<T>(json: any): T {
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data as T;
    }
    return json as T;
  }

  public async obtenerProductos(): Promise<Producto[]> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/productos`);
      const json = await this.manejarRespuesta<{ success: boolean; data: any[] }>(respuesta);
      return json.data.map((d: any) => new Producto(
        d.id, d.nombre, d.descripcion, d.precio, d.categoria,
        d.imagen, d.stock, d.rating
      ));
    } catch (error) {
      console.error('Error en obtenerProductos:', error);
      throw error;
    }
  }

  public async obtenerProductoPorId(id: number): Promise<Producto | null> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/productos/${id}`);
      if (respuesta.status === 404) return null;
      const json = await this.manejarRespuesta<{ success: boolean; data: any }>(respuesta);
      return json.success ? new Producto(
        json.data.id, json.data.nombre, json.data.descripcion, json.data.precio,
        json.data.categoria, json.data.imagen, json.data.stock, json.data.rating
      ) : null;
    } catch (error) {
      console.error('Error en obtenerProductoPorId:', error);
      throw error;
    }
  }

  public async buscarProductos(termino: string): Promise<Producto[]> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/buscar?q=${encodeURIComponent(termino)}`);
      const json = await this.manejarRespuesta<{ success: boolean; data: any[] }>(respuesta);
      return json.data.map((d: any) => new Producto(
        d.id, d.nombre, d.descripcion, d.precio, d.categoria,
        d.imagen, d.stock, d.rating
      ));
    } catch (error) {
      console.error('Error en buscarProductos:', error);
      return [];
    }
  }

  public async obtenerCategorias(): Promise<string[]> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/categorias`);
      const json = await this.manejarRespuesta<{ success: boolean; data: string[] }>(respuesta);
      return json.data;
    } catch (error) {
      console.error('Error en obtenerCategorias:', error);
      return [];
    }
  }

  public async agregarAlCarrito(productoId: number, cantidad: number): Promise<any> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/carrito`, {
        method: 'POST',
        headers: this.headers(true),
        body: JSON.stringify({ productoId, cantidad })
      });
      return await this.manejarRespuesta<any>(respuesta);
    } catch (error) {
      console.error('Error en agregarAlCarrito:', error);
      throw error;
    }
  }

  public async login(datos: ILoginDatos): Promise<ILoginRespuesta> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/auth/login`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(datos)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: ILoginRespuesta }>(respuesta);
      const data = this.extraerDato<ILoginRespuesta>(json);
      _tokenActual = data.token;
      return data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  public async registro(datos: IRegistroDatos): Promise<ILoginRespuesta> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/auth/registro`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(datos)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: ILoginRespuesta }>(respuesta);
      const data = this.extraerDato<ILoginRespuesta>(json);
      _tokenActual = data.token;
      return data;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  public async logout(): Promise<void> {
    try {
      await fetch(`${this._baseUrl}/auth/logout`, {
        method: 'POST',
        headers: this.headers(true)
      });
    } finally {
      _tokenActual = null;
    }
  }

  public async obtenerPerfil(): Promise<IUsuario | null> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/auth/me`, {
        headers: this.headers(true)
      });
      if (respuesta.status === 401) return null;
      const json = await this.manejarRespuesta<{ success: boolean; data: IUsuario }>(respuesta);
      return this.extraerDato<IUsuario>(json);
    } catch (error) {
      console.error('Error en obtenerPerfil:', error);
      throw error;
    }
  }

  public async crearPedido(payload: {
    items: { productoId: number; cantidad: number; precioUnitario: number }[];
    total: number;
    direccionEnvio: IDireccionEnvioSnapshot;
  }): Promise<IPedido> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/pedidos`, {
        method: 'POST',
        headers: this.headers(true),
        body: JSON.stringify(payload)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: IPedido }>(respuesta);
      return this.extraerDato<IPedido>(json);
    } catch (error) {
      console.error('Error en crearPedido:', error);
      throw error;
    }
  }

  public async obtenerPedidos(): Promise<IPedido[]> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/pedidos`, {
        headers: this.headers(true)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: IPedido[] }>(respuesta);
      const data = this.extraerDato<IPedido[]>(json);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error en obtenerPedidos:', error);
      throw error;
    }
  }

  public async obtenerPedidoPorId(id: number | string): Promise<IPedido | null> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/pedidos/${id}`, {
        headers: this.headers(true)
      });
      if (respuesta.status === 404) return null;
      const json = await this.manejarRespuesta<{ success: boolean; data: IPedido }>(respuesta);
      return this.extraerDato<IPedido>(json);
    } catch (error) {
      console.error('Error en obtenerPedidoPorId:', error);
      throw error;
    }
  }

  public async solicitarRecuperacion(email: string): Promise<IRecuperacionRespuesta> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/auth/recuperar`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ email })
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: IRecuperacionRespuesta }>(respuesta);
      return this.extraerDato<IRecuperacionRespuesta>(json);
    } catch (error) {
      console.error('Error en solicitarRecuperacion:', error);
      throw error;
    }
  }

  public async resetearPassword(token: string, nuevoPassword: string): Promise<{ mensaje: string }> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/auth/resetear`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ token, nuevoPassword })
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: { mensaje: string } }>(respuesta);
      return this.extraerDato<{ mensaje: string }>(json);
    } catch (error) {
      console.error('Error en resetearPassword:', error);
      throw error;
    }
  }

  public async obtenerSesiones(): Promise<ISesionRemota[]> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/auth/sesiones`, {
        headers: this.headers(true)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: ISesionRemota[] }>(respuesta);
      const data = this.extraerDato<ISesionRemota[]>(json);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error en obtenerSesiones:', error);
      throw error;
    }
  }

  public async cerrarSesionRemota(id: number | string): Promise<{ mensaje: string }> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/auth/sesiones/${id}`, {
        method: 'DELETE',
        headers: this.headers(true)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: { mensaje: string } }>(respuesta);
      return this.extraerDato<{ mensaje: string }>(json);
    } catch (error) {
      console.error('Error en cerrarSesion:', error);
      throw error;
    }
  }

  public async cerrarOtrasSesiones(): Promise<{ mensaje: string; cerradas: number }> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/auth/sesiones/otras`, {
        method: 'DELETE',
        headers: this.headers(true)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: { mensaje: string; cerradas: number } }>(respuesta);
      return this.extraerDato<{ mensaje: string; cerradas: number }>(json);
    } catch (error) {
      console.error('Error en cerrarOtrasSesiones:', error);
      throw error;
    }
  }

  public async obtenerEstadisticas(): Promise<IEstadisticas> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/admin/estadisticas`, {
        headers: this.headers(true)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: IEstadisticas }>(respuesta);
      return this.extraerDato<IEstadisticas>(json);
    } catch (error) {
      console.error('Error en obtenerEstadisticas:', error);
      throw error;
    }
  }

  public async obtenerTodosPedidos(): Promise<IPedido[]> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/admin/pedidos`, {
        headers: this.headers(true)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: IPedido[] }>(respuesta);
      const data = this.extraerDato<IPedido[]>(json);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error en obtenerTodosPedidos:', error);
      throw error;
    }
  }

  public async obtenerTodosUsuarios(): Promise<IUsuario[]> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/admin/usuarios`, {
        headers: this.headers(true)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: IUsuario[] }>(respuesta);
      const data = this.extraerDato<IUsuario[]>(json);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error en obtenerTodosUsuarios:', error);
      throw error;
    }
  }

  public async actualizarEstadoPedido(id: number | string, estado: EstadoPedido | string): Promise<IPedido> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/admin/pedidos/${id}/estado`, {
        method: 'PATCH',
        headers: this.headers(true),
        body: JSON.stringify({ estado })
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: IPedido }>(respuesta);
      return this.extraerDato<IPedido>(json);
    } catch (error) {
      console.error('Error en actualizarEstadoPedido:', error);
      throw error;
    }
  }

  public async crearProducto(payload: IProductoPayload): Promise<Producto> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/admin/productos`, {
        method: 'POST',
        headers: this.headers(true),
        body: JSON.stringify(payload)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: any }>(respuesta);
      const data = this.extraerDato<any>(json);
      return new Producto(
        data.id, data.nombre, data.descripcion, data.precio,
        data.categoria, data.imagen, data.stock, data.rating
      );
    } catch (error) {
      console.error('Error en crearProducto:', error);
      throw error;
    }
  }

  public async actualizarProducto(id: number | string, payload: Partial<IProductoPayload>): Promise<Producto> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/admin/productos/${id}`, {
        method: 'PUT',
        headers: this.headers(true),
        body: JSON.stringify(payload)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: any }>(respuesta);
      const data = this.extraerDato<any>(json);
      return new Producto(
        data.id, data.nombre, data.descripcion, data.precio,
        data.categoria, data.imagen, data.stock, data.rating
      );
    } catch (error) {
      console.error('Error en actualizarProducto:', error);
      throw error;
    }
  }

  public async eliminarProducto(id: number | string): Promise<{ mensaje: string }> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/admin/productos/${id}`, {
        method: 'DELETE',
        headers: this.headers(true)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: { mensaje: string } }>(respuesta);
      return this.extraerDato<{ mensaje: string }>(json);
    } catch (error) {
      console.error('Error en eliminarProducto:', error);
      throw error;
    }
  }

  public async eliminarUsuario(id: number | string): Promise<{ mensaje: string }> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/admin/usuarios/${id}`, {
        method: 'DELETE',
        headers: this.headers(true)
      });
      const json = await this.manejarRespuesta<{ success: boolean; data: { mensaje: string } }>(respuesta);
      return this.extraerDato<{ mensaje: string }>(json);
    } catch (error) {
      console.error('Error en eliminarUsuario:', error);
      throw error;
    }
  }
}

export const api = new ApiService();
