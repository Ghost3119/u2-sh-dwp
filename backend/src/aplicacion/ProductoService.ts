import { Producto, IProducto, IItemCarrito } from '../dominio/Producto';
import { Carrito } from '../dominio/Carrito';
import { ProductoRepository } from '../infraestructura/ProductoRepository';

export class ProductoService {
  private repository: ProductoRepository;

  constructor(repository: ProductoRepository) {
    this.repository = repository;
  }

  public async listarProductos(): Promise<Producto[]> {
    return this.repository.obtenerTodos();
  }

  public async obtenerProductoPorId(id: number): Promise<Producto | null> {
    if (id <= 0) {
      throw new Error('ID invalido');
    }
    return this.repository.obtenerPorId(id);
  }

  public async buscarProductos(termino: string): Promise<Producto[]> {
    if (!termino || termino.trim().length === 0) {
      return this.listarProductos();
    }
    return this.repository.buscar(termino.toLowerCase());
  }

  public async listarCategorias(): Promise<string[]> {
    return this.repository.obtenerCategorias();
  }
}

export class CarritoService {
  private carritos: Map<string, Carrito> = new Map();
  private repository: ProductoRepository;

  constructor(repository: ProductoRepository) {
    this.repository = repository;
  }

  public async crearCarrito(productoId: number, cantidad: number): Promise<Carrito> {
    const producto = await this.repository.obtenerPorId(productoId);
    if (!producto) {
      throw new Error(`Producto con id ${productoId} no encontrado`);
    }
    if (cantidad <= 0) {
      throw new Error('Cantidad debe ser mayor a 0');
    }
    const id = `cart-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const carrito = new Carrito(id);
    carrito.agregarItem(productoId, producto.precio, cantidad);
    this.carritos.set(id, carrito);
    return carrito;
  }

  public async obtenerCarrito(id: string): Promise<Carrito | null> {
    return this.carritos.get(id) || null;
  }
}
