import { Pedido, IPedido } from '../dominio/Pedido';
import { PedidoRepository, INuevoPedidoItem } from '../infraestructura/PedidoRepository';
import { ProductoRepository } from '../infraestructura/ProductoRepository';

export interface IItemEntrada {
  productoId: number;
  cantidad: number;
}

export interface ICrearPedidoInput {
  usuarioId: number;
  items: IItemEntrada[];
  direccionEnvio: string;
}

export class PedidoError extends Error {
  public status: number;
  constructor(mensaje: string, status: number = 400) {
    super(mensaje);
    this.status = status;
    this.name = 'PedidoError';
  }
}

export class PedidoService {
  private pedidoRepo: PedidoRepository;
  private productoRepo: ProductoRepository;

  constructor(pedidoRepo: PedidoRepository, productoRepo: ProductoRepository) {
    this.pedidoRepo = pedidoRepo;
    this.productoRepo = productoRepo;
  }

  public async crearPedido(input: ICrearPedidoInput): Promise<IPedido> {
    const { usuarioId, items, direccionEnvio } = input;

    if (!Array.isArray(items) || items.length === 0) {
      throw new PedidoError('El pedido debe tener al menos un item', 400);
    }
    for (const it of items) {
      if (!Number.isInteger(it.productoId) || it.productoId <= 0) {
        throw new PedidoError('productoId invalido', 400);
      }
      if (!Number.isInteger(it.cantidad) || it.cantidad <= 0) {
        throw new PedidoError('cantidad debe ser un entero positivo', 400);
      }
    }

    for (const it of items) {
      const producto = await this.productoRepo.obtenerPorId(it.productoId);
      if (!producto) {
        throw new PedidoError(`Producto ${it.productoId} no encontrado`, 404);
      }
      if (producto.stock < it.cantidad) {
        throw new PedidoError(
          `Stock insuficiente para "${producto.nombre}" (disponible: ${producto.stock})`,
          409
        );
      }
    }

    const itemsRepo: INuevoPedidoItem[] = items.map((i) => ({
      productoId: i.productoId,
      cantidad: i.cantidad
    }));

    await this.productoRepo.descontarStock(itemsRepo);

    try {
      const pedido = this.pedidoRepo.crear(usuarioId, itemsRepo, direccionEnvio);
      return pedido.toDTO();
    } catch (err: any) {
      throw new PedidoError(err.message || 'Error al crear el pedido', 500);
    }
  }

  public listarPedidosUsuario(usuarioId: number): IPedido[] {
    return this.pedidoRepo.obtenerPorUsuario(usuarioId).map((p) => p.toDTO());
  }

  public obtenerPedido(id: number, usuarioId: number): IPedido {
    const pedido = this.pedidoRepo.obtenerPorId(id, usuarioId);
    if (!pedido) {
      throw new PedidoError('Pedido no encontrado', 404);
    }
    return pedido.toDTO();
  }
}
