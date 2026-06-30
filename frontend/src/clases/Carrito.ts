import { Producto } from './Producto';

export interface IItemCarrito {
  producto: Producto;
  cantidad: number;
}

export class Carrito {
  private _items: IItemCarrito[] = [];
  private _favoritos: Set<number> = new Set();
  private _id: string;

  constructor(id: string = `cart-${Date.now()}`) {
    this._id = id;
  }

  public get id(): string { return this._id; }
  public get items(): IItemCarrito[] { return [...this._items]; }
  public get favoritos(): number[] { return Array.from(this._favoritos); }

  public get total(): number {
    return this._items.reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0);
  }

  public get cantidadTotal(): number {
    return this._items.reduce((acc, item) => acc + item.cantidad, 0);
  }

  public agregarProducto(producto: Producto, cantidad: number = 1): void {
    const existente = this._items.find(i => i.producto.id === producto.id);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      this._items.push({ producto, cantidad });
    }
  }

  public eliminarProducto(productoId: number): void {
    this._items = this._items.filter(i => i.producto.id !== productoId);
  }

  public vaciar(): void {
    this._items = [];
  }

  public toggleFavorito(productoId: number): boolean {
    if (this._favoritos.has(productoId)) {
      this._favoritos.delete(productoId);
      return false;
    }
    this._favoritos.add(productoId);
    return true;
  }

  public esFavorito(productoId: number): boolean {
    return this._favoritos.has(productoId);
  }
}
