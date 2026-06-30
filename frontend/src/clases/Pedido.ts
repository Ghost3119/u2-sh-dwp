export interface IPedidoItem {
  productoId: number;
  nombre?: string;
  imagen?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal?: number;
}

export interface IDireccionEnvioSnapshot {
  calle: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  pais?: string;
  telefono?: string;
  referencias?: string;
}

export type EstadoPedido = 'pendiente' | 'procesando' | 'enviado' | 'entregado' | 'cancelado';

export interface IPedido {
  id: number | string;
  items: IPedidoItem[];
  total: number;
  estado: EstadoPedido | string;
  fecha: string;
  direccionEnvio?: IDireccionEnvioSnapshot;
}

export class Pedido {
  constructor(
    public id: number | string,
    public items: IPedidoItem[],
    public total: number,
    public estado: EstadoPedido | string,
    public fecha: string,
    public direccionEnvio?: IDireccionEnvioSnapshot
  ) {}

  public get cantidadItems(): number {
    return this.items.reduce((acc, i) => acc + i.cantidad, 0);
  }

  public get totalFormateado(): string {
    return `$${this.total.toFixed(2)} MXN`;
  }

  public get fechaFormateada(): string {
    try {
      const d = new Date(this.fecha);
      return d.toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return this.fecha;
    }
  }

  public get estadoLegible(): string {
    const mapa: Record<string, string> = {
      pendiente: 'Pendiente',
      procesando: 'Procesando',
      enviado: 'Enviado',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return mapa[this.estado as string] || this.estado;
  }

  public esCancelable(): boolean {
    return this.estado === 'pendiente' || this.estado === 'procesando';
  }
}
