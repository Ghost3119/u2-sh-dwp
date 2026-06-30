import request from 'supertest';
import { construirAppTest, ITestApp } from '../helpers/appTest';

describe('e2e /api/pedidos', () => {
  let ctx: ITestApp;

  beforeAll(() => {
    ctx = construirAppTest();
  });

  beforeEach(() => {
    ctx.reiniciar();
  });

  const registrarYObtenerToken = async (username: string, email: string) => {
    const res = await request(ctx.app)
      .post('/api/auth/registro')
      .send({
        username,
        email,
        password: 'pass1234',
        nombreCompleto: username
      });
    return res.body.data.token as string;
  };

  describe('POST /api/pedidos', () => {
    it('crea un pedido con token valido', async () => {
      const token = await registrarYObtenerToken('userPedido1', 'p1@utc.mx');
      const res = await request(ctx.app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ productoId: 1, cantidad: 2 }],
          direccionEnvio: 'Av. Universidad 123, CDMX, MX'
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(50000);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.estado).toBe('completado');
    });

    it('descuenta el stock al crear el pedido', async () => {
      const token = await registrarYObtenerToken('userPedido2', 'p2@utc.mx');
      const antes = await request(ctx.app).get('/api/productos/1');
      const stockAntes = antes.body.data.stock;

      await request(ctx.app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ productoId: 1, cantidad: 1 }],
          direccionEnvio: 'Av. Siempre Viva 742, CDMX'
        });

      const despues = await request(ctx.app).get('/api/productos/1');
      expect(despues.body.data.stock).toBe(stockAntes - 1);
    });

    it('rechaza la creacion sin token con 401', async () => {
      const res = await request(ctx.app)
        .post('/api/pedidos')
        .send({
          items: [{ productoId: 1, cantidad: 1 }],
          direccionEnvio: 'Av. Universidad 123, CDMX'
        });
      expect(res.status).toBe(401);
    });

    it('rechaza items vacios con 400', async () => {
      const token = await registrarYObtenerToken('userPedido3', 'p3@utc.mx');
      const res = await request(ctx.app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [], direccionEnvio: 'Av. Universidad 123, CDMX' });
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errores)).toBe(true);
    });

    it('rechaza direccion de envio muy corta con 400', async () => {
      const token = await registrarYObtenerToken('userPedido4', 'p4@utc.mx');
      const res = await request(ctx.app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productoId: 1, cantidad: 1 }], direccionEnvio: 'corta' });
      expect(res.status).toBe(400);
    });

    it('rechaza cuando el stock es insuficiente con 409', async () => {
      const token = await registrarYObtenerToken('userPedido5', 'p5@utc.mx');
      const res = await request(ctx.app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ productoId: 3, cantidad: 9999 }],
          direccionEnvio: 'Av. Universidad 123, CDMX'
        });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/stock/i);
    });
  });

  describe('GET /api/pedidos', () => {
    it('lista solo los pedidos del usuario autenticado y NO los de otro', async () => {
      const tokenA = await registrarYObtenerToken('usuarioA', 'a@utc.mx');
      const tokenB = await registrarYObtenerToken('usuarioB', 'b@utc.mx');

      // A crea 1 pedido
      await request(ctx.app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          items: [{ productoId: 1, cantidad: 1 }],
          direccionEnvio: 'Av. Universidad 123, CDMX'
        });

      const resA = await request(ctx.app)
        .get('/api/pedidos')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resA.status).toBe(200);
      expect(resA.body.data.length).toBe(1);

      // B no debe ver los pedidos de A
      const resB = await request(ctx.app)
        .get('/api/pedidos')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(resB.status).toBe(200);
      expect(resB.body.data).toEqual([]);
    });

    it('rechaza sin token con 401', async () => {
      const res = await request(ctx.app).get('/api/pedidos');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/pedidos/:id', () => {
    it('un usuario NO puede ver el pedido de otro usuario (devuelve 404)', async () => {
      const tokenA = await registrarYObtenerToken('usuarioA2', 'a2@utc.mx');
      const tokenB = await registrarYObtenerToken('usuarioB2', 'b2@utc.mx');

      const creado = await request(ctx.app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          items: [{ productoId: 2, cantidad: 1 }],
          direccionEnvio: 'Av. Universidad 123, CDMX'
        });
      const pedidoId = creado.body.data.id;

      const res = await request(ctx.app)
        .get(`/api/pedidos/${pedidoId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });

    it('rechaza id invalido con 400', async () => {
      const token = await registrarYObtenerToken('userX', 'x@utc.mx');
      const res = await request(ctx.app)
        .get('/api/pedidos/abc')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });
});
