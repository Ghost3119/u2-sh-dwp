export interface IPedidoItem {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface IPedido {
  id: number;
  usuarioId: number;
  total: number;
  estado: string;
  direccionEnvio: string;
  createdAt: string;
  items: IPedidoItem[];
}

export type EstadoPedido = 'pendiente' | 'completado' | 'cancelado';

export class PedidoItem implements IPedidoItem {
  constructor(
    public productoId: number,
    public nombre: string,
    public cantidad: number,
    public precioUnitario: number,
    public subtotal: number
  ) {}

  public static calcular(
    productoId: number,
    nombre: string,
    cantidad: number,
    precioUnitario: number
  ): PedidoItem {
    return new PedidoItem(
      productoId,
      nombre,
      cantidad,
      precioUnitario,
      cantidad * precioUnitario
    );
  }
}

export class Pedido implements IPedido {
  public items: PedidoItem[];

  constructor(
    public id: number,
    public usuarioId: number,
    public total: number,
    public estado: string,
    public direccionEnvio: string,
    public createdAt: string,
    items: IPedidoItem[] = []
  ) {
    this.items = items.map(
      (i) =>
        new PedidoItem(
          i.productoId,
          i.nombre,
          i.cantidad,
          i.precioUnitario,
          i.subtotal
        )
    );
  }

  public obtenerCantidadTotal(): number {
    return this.items.reduce((acc, i) => acc + i.cantidad, 0);
  }

  public toDTO(): IPedido {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      total: this.total,
      estado: this.estado,
      direccionEnvio: this.direccionEnvio,
      createdAt: this.createdAt,
      items: this.items.map((i) => ({
        productoId: i.productoId,
        nombre: i.nombre,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        subtotal: i.subtotal
      }))
    };
  }
}
