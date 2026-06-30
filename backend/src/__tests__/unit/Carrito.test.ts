import { Carrito } from '../../dominio/Carrito';
import { Producto } from '../../dominio/Producto';

const makeProducto = (id: number, precio: number, nombre = `Prod ${id}`): Producto =>
  new Producto(id, nombre, 'desc', precio, 'Cat', 'img', 10, 4.0);

describe('Carrito (backend/dominio)', () => {
  describe('agregarItem()', () => {
    it('agrega un item nuevo al carrito vacio', () => {
      const c = new Carrito('cart-1');
      c.agregarItem(1, 100, 2);
      expect(c.items).toHaveLength(1);
      expect(c.items[0]).toEqual({ productoId: 1, precioUnitario: 100, cantidad: 2 });
    });

    it('incrementa la cantidad si el producto ya existe', () => {
      const c = new Carrito('cart-1');
      c.agregarItem(1, 100, 1);
      c.agregarItem(1, 100, 3);
      expect(c.items).toHaveLength(1);
      expect(c.items[0].cantidad).toBe(4);
    });

    it('permite multiples productos distintos', () => {
      const c = new Carrito('cart-1');
      c.agregarItem(1, 100, 1);
      c.agregarItem(2, 200, 2);
      expect(c.items).toHaveLength(2);
    });
  });

  describe('calcular total (getter total)', () => {
    it('retorna 0 cuando el carrito esta vacio', () => {
      const c = new Carrito('cart-1');
      expect(c.total).toBe(0);
    });

    it('suma correctamente precioUnitario * cantidad por item', () => {
      const c = new Carrito('cart-1');
      c.agregarItem(1, 100, 2);
      c.agregarItem(2, 50, 4);
      expect(c.total).toBe(100 * 2 + 50 * 4);
    });

    it('refleja el cambio cuando se agregan items al mismo producto', () => {
      const c = new Carrito('cart-1');
      c.agregarItem(1, 200, 1);
      expect(c.total).toBe(200);
      c.agregarItem(1, 200, 2);
      expect(c.total).toBe(600);
    });
  });

  describe('obtenerCantidadTotal()', () => {
    it('cuenta el total de unidades (no de items)', () => {
      const c = new Carrito('cart-1');
      c.agregarItem(1, 10, 3);
      c.agregarItem(2, 20, 2);
      expect(c.obtenerCantidadTotal()).toBe(5);
    });
  });

  describe('toDTO()', () => {
    it('incluye id, items, fechaCreacion y total', () => {
      const c = new Carrito('cart-X', [{ productoId: 1, precioUnitario: 100, cantidad: 1 }]);
      const dto = c.toDTO();
      expect(dto.id).toBe('cart-X');
      expect(dto.items).toHaveLength(1);
      expect(dto.total).toBe(100);
      expect(typeof dto.fechaCreacion).toBe('string');
    });
  });
});
