import { Pedido, PedidoItem } from '../../dominio/Pedido';

describe('Pedido (backend/dominio)', () => {
  describe('PedidoItem.calcular()', () => {
    it('calcula el subtotal como cantidad * precioUnitario', () => {
      const item = PedidoItem.calcular(1, 'Laptop', 2, 18999);
      expect(item.subtotal).toBe(37998);
      expect(item.productoId).toBe(1);
      expect(item.cantidad).toBe(2);
      expect(item.precioUnitario).toBe(18999);
    });

    it('subtotal = 0 cuando cantidad es 0', () => {
      const item = PedidoItem.calcular(1, 'X', 0, 1000);
      expect(item.subtotal).toBe(0);
    });
  });

  describe('Pedido - constructor con items', () => {
    it('rechaza un pedido sin items al calcular su informacion derivada', () => {
      const p = new Pedido(1, 1, 0, 'pendiente', 'Av. Universidad 123, CDMX', '2026-01-01', []);
      expect(p.items).toHaveLength(0);
      expect(p.obtenerCantidadTotal()).toBe(0);
    });

    it('inicializa items correctamente desde un arreglo de DTOs', () => {
      const dtoItems = [
        { productoId: 1, nombre: 'A', cantidad: 2, precioUnitario: 100, subtotal: 200 },
        { productoId: 2, nombre: 'B', cantidad: 1, precioUnitario: 50, subtotal: 50 }
      ];
      const p = new Pedido(10, 1, 250, 'completado', 'Direccion 123', '2026-01-01', dtoItems);
      expect(p.items).toHaveLength(2);
      expect(p.items[0]).toBeInstanceOf(PedidoItem);
      expect(p.obtenerCantidadTotal()).toBe(3);
    });
  });

  describe('toDTO()', () => {
    it('serializa el pedido sin perder campos', () => {
      const dtoItems = [
        { productoId: 1, nombre: 'A', cantidad: 1, precioUnitario: 100, subtotal: 100 }
      ];
      const p = new Pedido(1, 5, 100, 'completado', 'Calle 1', '2026-06-01', dtoItems);
      const dto = p.toDTO();
      expect(dto).toEqual({
        id: 1,
        usuarioId: 5,
        total: 100,
        estado: 'completado',
        direccionEnvio: 'Calle 1',
        createdAt: '2026-06-01',
        items: [
          { productoId: 1, nombre: 'A', cantidad: 1, precioUnitario: 100, subtotal: 100 }
        ]
      });
    });
  });
});
