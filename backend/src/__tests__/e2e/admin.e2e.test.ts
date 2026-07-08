import request from 'supertest';
import { construirAppTest, ITestApp } from '../helpers/appTest';
import { loginComo, registrarYObtenerToken } from '../helpers/auth.helper';

describe('e2e /api/admin (panel administrador - U3)', () => {
  let ctx: ITestApp;

  beforeAll(() => {
    ctx = construirAppTest();
  });

  beforeEach(() => {
    ctx.reiniciar();
  });

  describe('GET /api/admin/estadisticas', () => {
    it('sin token devuelve 401', async () => {
      const res = await request(ctx.app).get('/api/admin/estadisticas');
      expect(res.status).toBe(401);
    });

    it('con token de cliente devuelve 403 (requiere rol admin)', async () => {
      const { token } = await loginComo(ctx.app, 'cliente');
      const res = await request(ctx.app)
        .get('/api/admin/estadisticas')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('con token de admin devuelve 200 y payload con totales', async () => {
      const { token } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .get('/api/admin/estadisticas')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.totalUsuarios).toBeGreaterThanOrEqual(2);
      expect(res.body.data.totalProductos).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(res.body.data.pedidosPorEstado)).toBe(true);
      expect(Array.isArray(res.body.data.topProductos)).toBe(true);
    });
  });

  describe('GET /api/admin/usuarios', () => {
    it('con admin devuelve 200 con array que incluye al menos admin y demo', async () => {
      const { token } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const usernames = res.body.data.map((u: any) => u.username);
      expect(usernames).toContain('admin');
      expect(usernames).toContain('demo');
    });

    it('con cliente devuelve 403', async () => {
      const { token } = await loginComo(ctx.app, 'cliente');
      const res = await request(ctx.app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('los passwords NO se exponen en la respuesta', async () => {
      const { token } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      res.body.data.forEach((u: any) => {
        expect(u.passwordHash).toBeUndefined();
        expect(u.password).toBeUndefined();
        expect(u.password_hash).toBeUndefined();
      });
    });
  });

  describe('GET /api/admin/pedidos', () => {
    it('con admin devuelve 200 con array de pedidos', async () => {
      const { token: tokenAdmin } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .get('/api/admin/pedidos')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('con cliente devuelve 403', async () => {
      const { token } = await loginComo(ctx.app, 'cliente');
      const res = await request(ctx.app)
        .get('/api/admin/pedidos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('los pedidos del admin incluyen informacion del cliente (username, email)', async () => {
      const { token: tokenCli } = await loginComo(ctx.app, 'cliente');
      await request(ctx.app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${tokenCli}`)
        .send({
          items: [{ productoId: 1, cantidad: 1 }],
          direccionEnvio: 'Av. Universidad 123, CDMX'
        });

      const { token: tokenAdmin } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .get('/api/admin/pedidos')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const pedido = res.body.data[0];
      expect(pedido.username).toBe('demo');
      expect(pedido.email).toMatch(/@/);
    });
  });

  describe('PATCH /api/admin/pedidos/:id/estado', () => {
    let pedidoId: number;

    const crearPedido = async (): Promise<number> => {
      const { token } = await loginComo(ctx.app, 'cliente');
      const res = await request(ctx.app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ productoId: 1, cantidad: 1 }],
          direccionEnvio: 'Av. Universidad 123, CDMX'
        });
      return res.body.data.id;
    };

    it('con admin y estado valido devuelve 200 y actualiza', async () => {
      pedidoId = await crearPedido();
      const { token } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .patch(`/api/admin/pedidos/${pedidoId}/estado`)
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'enviado' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mensaje).toMatch(/enviado/i);

      const ver = await request(ctx.app)
        .get('/api/admin/pedidos')
        .set('Authorization', `Bearer ${token}`);
      const pedido = ver.body.data.find((p: any) => p.id === pedidoId);
      expect(pedido.estado).toBe('enviado');
    });

    it('con estado invalido devuelve 400', async () => {
      pedidoId = await crearPedido();
      const { token } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .patch(`/api/admin/pedidos/${pedidoId}/estado`)
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'ESTADO_INVENTADO' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/estado/i);
    });

    it('con cliente devuelve 403', async () => {
      pedidoId = await crearPedido();
      const { token } = await loginComo(ctx.app, 'cliente');
      const res = await request(ctx.app)
        .patch(`/api/admin/pedidos/${pedidoId}/estado`)
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'enviado' });
      expect(res.status).toBe(403);
    });

    it('acepta todos los estados validos: pendiente, procesando, enviado, entregado, cancelado', async () => {
      const { token } = await loginComo(ctx.app, 'admin');
      const estados = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];
      for (const est of estados) {
        const id = await crearPedido();
        const res = await request(ctx.app)
          .patch(`/api/admin/pedidos/${id}/estado`)
          .set('Authorization', `Bearer ${token}`)
          .send({ estado: est });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('POST /api/admin/productos', () => {
    const nuevoProducto = {
      nombre: 'Webcam HD 4K',
      descripcion: 'Camara de alta definicion para streaming profesional',
      precio: 1999,
      categoria: 'Electronica',
      imagen: 'https://img.test/webcam.jpg',
      stock: 25,
      rating: 4.5
    };

    it('con admin devuelve 201 y el producto creado', async () => {
      const { token } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .post('/api/admin/productos')
        .set('Authorization', `Bearer ${token}`)
        .send(nuevoProducto);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nombre).toBe(nuevoProducto.nombre);
      expect(res.body.data.id).toEqual(expect.any(Number));
    });

    it('con cliente devuelve 403', async () => {
      const { token } = await loginComo(ctx.app, 'cliente');
      const res = await request(ctx.app)
        .post('/api/admin/productos')
        .set('Authorization', `Bearer ${token}`)
        .send(nuevoProducto);
      expect(res.status).toBe(403);
    });

    it('sin campos requeridos devuelve 400 con errores de validacion', async () => {
      const { token } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .post('/api/admin/productos')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'X' });
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errores)).toBe(true);
      expect(res.body.errores.length).toBeGreaterThan(0);
    });

    it('el producto creado aparece en GET /api/productos', async () => {
      const { token } = await loginComo(ctx.app, 'admin');
      const crear = await request(ctx.app)
        .post('/api/admin/productos')
        .set('Authorization', `Bearer ${token}`)
        .send(nuevoProducto);
      const idCreado = crear.body.data.id;

      const lista = await request(ctx.app).get('/api/productos');
      const nombres = lista.body.data.map((p: any) => p.nombre);
      expect(nombres).toContain(nuevoProducto.nombre);

      const detalle = await request(ctx.app).get(`/api/productos/${idCreado}`);
      expect(detalle.status).toBe(200);
      expect(detalle.body.data.nombre).toBe(nuevoProducto.nombre);
    });
  });

  describe('DELETE /api/admin/usuarios/:id', () => {
    it('con admin elimina un cliente y devuelve 200', async () => {
      const { token: tokenAdmin } = await loginComo(ctx.app, 'admin');
      const { usuarioId: idBorrable } = await registrarYObtenerToken(
        ctx.app,
        'borrable',
        'pass1234',
        'borrable@utc.mx'
      );

      const res = await request(ctx.app)
        .delete(`/api/admin/usuarios/${idBorrable}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mensaje).toMatch(/borrable/i);
    });

    it('intentar borrarse a si mismo devuelve 400', async () => {
      const { token, usuarioId: adminId } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .delete(`/api/admin/usuarios/${adminId}`)
        .set('Authorization', `Bearer ${token}`);
      expect([400, 403]).toContain(res.status);
      expect(res.body.error).toMatch(/a ti mismo/i);
    });

    it('con id invalido devuelve 400', async () => {
      const { token } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .delete('/api/admin/usuarios/abc')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it('con id inexistente devuelve 404', async () => {
      const { token } = await loginComo(ctx.app, 'admin');
      const res = await request(ctx.app)
        .delete('/api/admin/usuarios/99999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('con cliente devuelve 403', async () => {
      const { token } = await loginComo(ctx.app, 'cliente');
      const res = await request(ctx.app)
        .delete('/api/admin/usuarios/2')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
});
