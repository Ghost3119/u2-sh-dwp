export interface IProducto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  stock: number;
  rating: number;
}

export class Producto implements IProducto {
  constructor(
    public id: number,
    public nombre: string,
    public descripcion: string,
    public precio: number,
    public categoria: string,
    public imagen: string,
    public stock: number,
    public rating: number
  ) {}

  public obtenerPrecioFormateado(): string {
    return `$${this.precio.toFixed(2)} MXN`;
  }

  public tieneStock(): boolean {
    return this.stock > 0;
  }

  public esDestacado(): boolean {
    return this.rating >= 4.5;
  }

  public static desdeDTO(dto: IProducto): Producto {
    return new Producto(
      dto.id,
      dto.nombre,
      dto.descripcion,
      dto.precio,
      dto.categoria,
      dto.imagen,
      dto.stock,
      dto.rating
    );
  }
}

export interface IItemCarrito {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}

export interface ICarrito {
  id: string;
  items: IItemCarrito[];
  fechaCreacion: string;
  total: number;
}
