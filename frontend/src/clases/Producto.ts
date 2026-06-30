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

export class Producto {
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
    return this._stock > 0;
  }

  public esDestacado(): boolean {
    return this._rating >= 4.5;
  }

  public get _stock(): number { return this.stock; }
  public get _rating(): number { return this.rating; }
}
