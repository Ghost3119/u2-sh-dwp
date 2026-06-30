import { Producto } from '../dominio/Producto';

export class ProductoRepository {
  private productos: Producto[];

  constructor() {
    this.productos = this.cargarDatosIniciales();
  }

  private cargarDatosIniciales(): Producto[] {
    return [
      new Producto(1, 'Laptop Gamer RTX 4070', 'Potente laptop para gaming y desarrollo con GPU RTX 4070 y 32GB RAM', 28999, 'Electronica', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=300&fit=crop', 15, 4.8),
      new Producto(2, 'Auriculares Bluetooth Pro', 'Cancelacion de ruido activa, 40h de bateria, sonido HiFi', 2499, 'Electronica', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop', 50, 4.6),
      new Producto(3, 'Teclado Mecanico RGB', 'Switches Cherry MX Red, iluminacion RGB customizable', 1899, 'Electronica', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=300&fit=crop', 30, 4.7),
      new Producto(4, 'Silla Ergonomica Premium', 'Soporte lumbar ajustable, material premium, reposabrazos 4D', 5499, 'Muebles', 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&h=300&fit=crop', 20, 4.5),
      new Producto(5, 'Monitor 4K 27 pulgadas', 'Resolucion 4K UHD, 144Hz, panel IPS, HDR400', 7999, 'Electronica', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop', 12, 4.9),
      new Producto(6, 'Mouse Inalambrico Gamer', 'Sensor optico 26000 DPI, 8 botones programables', 1299, 'Electronica', 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=300&fit=crop', 45, 4.4),
      new Producto(7, 'Escritorio Ajustable', 'Altura electrica, superficie de bambu, 140x70cm', 6299, 'Muebles', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop', 8, 4.3),
      new Producto(8, 'Camara Web 1080p', 'Auto focus, microfono integrado, ideal streaming', 1599, 'Electronica', 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&h=300&fit=crop', 25, 4.2),
      new Producto(9, 'Lampara LED Inteligente', '16 millones de colores, control por app, compatible Alexa', 899, 'Iluminacion', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop', 60, 4.5),
      new Producto(10, 'Disco SSD NVMe 1TB', 'Velocidad lectura 7000MB/s, instalacion sencilla', 1899, 'Almacenamiento', 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=300&fit=crop', 35, 4.8),
      new Producto(11, 'Mochila Antirrobo', 'Compartimento oculto USB, material impermeable', 1199, 'Accesorios', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop', 40, 4.4),
      new Producto(12, 'Cafetera Espresso Pro', '15 bares de presion, vaporizador, deposito 1.5L', 3299, 'Hogar', 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400&h=300&fit=crop', 18, 4.6)
    ];
  }

  public async obtenerTodos(): Promise<Producto[]> {
    return this.productos;
  }

  public async obtenerPorId(id: number): Promise<Producto | null> {
    return this.productos.find(p => p.id === id) || null;
  }

  public async buscar(termino: string): Promise<Producto[]> {
    return this.productos.filter(p =>
      p.nombre.toLowerCase().includes(termino) ||
      p.descripcion.toLowerCase().includes(termino) ||
      p.categoria.toLowerCase().includes(termino)
    );
  }
}
