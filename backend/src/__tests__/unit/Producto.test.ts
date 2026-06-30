import { Producto } from '../../dominio/Producto';

describe('Producto (backend/dominio)', () => {
  describe('constructor y propiedades', () => {
    it('crea un producto con todas sus propiedades', () => {
      const p = new Producto(1, 'Laptop', 'Ultraportatil', 18999, 'Electronica', 'https://img/laptop.jpg', 12, 4.7);
      expect(p.id).toBe(1);
      expect(p.nombre).toBe('Laptop');
      expect(p.descripcion).toBe('Ultraportatil');
      expect(p.precio).toBe(18999);
      expect(p.categoria).toBe('Electronica');
      expect(p.imagen).toBe('https://img/laptop.jpg');
      expect(p.stock).toBe(12);
      expect(p.rating).toBe(4.7);
    });

    it('acepta stock 0 y rating 0', () => {
      const p = new Producto(2, 'X', 'Y', 100, 'Cat', 'img', 0, 0);
      expect(p.stock).toBe(0);
      expect(p.rating).toBe(0);
    });
  });

  describe('obtenerPrecioFormateado()', () => {
    it('formatea el precio con dos decimales y MXN', () => {
      const p = new Producto(1, 'A', 'B', 2499.5, 'C', 'I', 10, 4);
      expect(p.obtenerPrecioFormateado()).toBe('$2499.50 MXN');
    });

    it('agrega ceros a la derecha cuando el precio es entero', () => {
      const p = new Producto(1, 'A', 'B', 1000, 'C', 'I', 10, 4);
      expect(p.obtenerPrecioFormateado()).toBe('$1000.00 MXN');
    });
  });

  describe('validacion de stock (tieneStock)', () => {
    it('retorna true cuando hay stock', () => {
      const p = new Producto(1, 'A', 'B', 100, 'C', 'I', 5, 4);
      expect(p.tieneStock()).toBe(true);
    });

    it('retorna false cuando stock es 0', () => {
      const p = new Producto(1, 'A', 'B', 100, 'C', 'I', 0, 4);
      expect(p.tieneStock()).toBe(false);
    });

    it('retorna false cuando stock es negativo (caso defensivo)', () => {
      const p = new Producto(1, 'A', 'B', 100, 'C', 'I', -1, 4);
      expect(p.tieneStock()).toBe(false);
    });
  });

  describe('esDestacado()', () => {
    it('retorna true cuando rating >= 4.5', () => {
      const p = new Producto(1, 'A', 'B', 100, 'C', 'I', 10, 4.5);
      expect(p.esDestacado()).toBe(true);
    });

    it('retorna true cuando rating es 5.0', () => {
      const p = new Producto(1, 'A', 'B', 100, 'C', 'I', 10, 5.0);
      expect(p.esDestacado()).toBe(true);
    });

    it('retorna false cuando rating es 4.4', () => {
      const p = new Producto(1, 'A', 'B', 100, 'C', 'I', 10, 4.4);
      expect(p.esDestacado()).toBe(false);
    });
  });

  describe('desdeDTO()', () => {
    it('reconstruye un producto a partir de un DTO', () => {
      const dto = {
        id: 7,
        nombre: 'Mouse',
        descripcion: 'Optico',
        precio: 599,
        categoria: 'Accesorios',
        imagen: 'img/mouse.jpg',
        stock: 20,
        rating: 4.2
      };
      const p = Producto.desdeDTO(dto);
      expect(p).toBeInstanceOf(Producto);
      expect(p.id).toBe(7);
      expect(p.nombre).toBe('Mouse');
    });
  });
});
