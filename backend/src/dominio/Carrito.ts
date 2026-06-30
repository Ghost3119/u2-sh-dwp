import { ICarrito, IItemCarrito } from './Producto';

export class Carrito implements ICarrito {
  public id: string;
  public items: IItemCarrito[];
  public fechaCreacion: string;

  constructor(id: string, items: IItemCarrito[] = []) {
    this.id = id;
    this.items = items;
    this.fechaCreacion = new Date().toISOString();
  }

  public get total(): number {
    return this.items.reduce(
      (acc, item) => acc + item.precioUnitario * item.cantidad,
      0
    );
  }

  public agregarItem(productoId: number, precioUnitario: number, cantidad: number = 1): void {
    const existente = this.items.find(i => i.productoId === productoId);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      this.items.push({ productoId, precioUnitario, cantidad });
    }
  }

  public obtenerCantidadTotal(): number {
    return this.items.reduce((acc, item) => acc + item.cantidad, 0);
  }

  public toDTO(): ICarrito {
    return {
      id: this.id,
      items: this.items,
      fechaCreacion: this.fechaCreacion,
      total: this.total
    };
  }
}
