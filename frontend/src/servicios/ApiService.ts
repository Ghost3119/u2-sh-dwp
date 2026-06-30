import { Producto } from '../clases/Producto';

const API_BASE = 'http://localhost:4000/api';

export class ApiService {
  private _baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this._baseUrl = baseUrl;
  }

  public get baseUrl(): string { return this._baseUrl; }

  public async obtenerProductos(): Promise<Producto[]> {
    try {
      const respuesta = await fetch(`${this._baseUrl}/productos`);
      if (!respuesta.ok) throw new Error(`HTTP error: ${respuesta.status}`);
      const json = await respuesta.json();
      if (!json.success) throw new Error(json.error || 'Error desconocido');
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
      if (!respuesta.ok) throw new Error(`HTTP error: ${respuesta.status}`);
      const json = await respuesta.json();
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
      if (!respuesta.ok) throw new Error(`HTTP error: ${respuesta.status}`);
      const json = await respuesta.json();
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
      if (!respuesta.ok) throw new Error(`HTTP error: ${respuesta.status}`);
      const json = await respuesta.json();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId, cantidad })
      });
      if (!respuesta.ok) throw new Error(`HTTP error: ${respuesta.status}`);
      const json = await respuesta.json();
      return json;
    } catch (error) {
      console.error('Error en agregarAlCarrito:', error);
      throw error;
    }
  }
}

export const api = new ApiService();
