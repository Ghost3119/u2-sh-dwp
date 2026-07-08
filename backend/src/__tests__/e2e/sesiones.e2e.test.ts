import request from 'supertest';
import { construirAppTest, ITestApp } from '../helpers/appTest';
import { loginComo, registrarYObtenerToken } from '../helpers/auth.helper';

describe('e2e /api/sesiones', () => {
  let ctx: ITestApp;

  beforeAll(() => {
    ctx = construirAppTest();
  });

  beforeEach(() => {
    ctx.reiniciar();
  });

  describe('GET /api/sesiones', () => {
    it('con token devuelve 200 con array de sesiones del usuario', async () => {
      const { token } = await loginComo(ctx.app, 'cliente');
      const res = await request(ctx.app)
        .get('/api/sesiones')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('sin token devuelve 401', async () => {
      const res = await request(ctx.app).get('/api/sesiones');
      expect(res.status).toBe(401);
    });

    it('login en 2 dispositivos genera 2 sesiones', async () => {
      const t1 = await loginComo(ctx.app, 'cliente');
      const t2 = await loginComo(ctx.app, 'cliente');
      expect(t1.token).not.toBe(t2.token);

      const res = await request(ctx.app)
        .get('/api/sesiones')
        .set('Authorization', `Bearer ${t1.token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('marca la sesion actual con esActual=true y las demas como false', async () => {
      const t1 = await loginComo(ctx.app, 'cliente');
      const t2 = await loginComo(ctx.app, 'cliente');
      const res = await request(ctx.app)
        .get('/api/sesiones')
        .set('Authorization', `Bearer ${t1.token}`);
      const actual = res.body.data.filter((s: any) => s.esActual === true);
      const otras = res.body.data.filter((s: any) => s.esActual === false);
      expect(actual.length).toBe(1);
      expect(otras.length).toBe(1);
    });
  });

  describe('DELETE /api/sesiones/:id', () => {
    it('cierra una sesion propia (no la actual) y devuelve 200', async () => {
      const t1 = await loginComo(ctx.app, 'cliente');
      const t2 = await loginComo(ctx.app, 'cliente');
      const lista = await request(ctx.app)
        .get('/api/sesiones')
        .set('Authorization', `Bearer ${t1.token}`);
      const otra = lista.body.data.find((s: any) => s.esActual === false);
      expect(otra).toBeDefined();

      const cerrar = await request(ctx.app)
        .delete(`/api/sesiones/${otra.id}`)
        .set('Authorization', `Bearer ${t1.token}`);
      expect(cerrar.status).toBe(200);
      expect(cerrar.body.success).toBe(true);
    });

    it('no permite cerrar la sesion actual desde este endpoint (400)', async () => {
      const { token } = await loginComo(ctx.app, 'cliente');
      const lista = await request(ctx.app)
        .get('/api/sesiones')
        .set('Authorization', `Bearer ${token}`);
      const actual = lista.body.data.find((s: any) => s.esActual === true);
      const cerrar = await request(ctx.app)
        .delete(`/api/sesiones/${actual.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect([400, 403]).toContain(cerrar.status);
    });

    it('con sesion de OTRO usuario devuelve 404', async () => {
      const { token: tokenA } = await loginComo(ctx.app, 'cliente');
      const sesionA = await request(ctx.app)
        .get('/api/sesiones')
        .set('Authorization', `Bearer ${tokenA}`);
      const idA = sesionA.body.data[0].id;

      const { token: tokenB } = await registrarYObtenerToken(
        ctx.app,
        'otroUser',
        'pass1234',
        'otro@utc.mx'
      );
      const cerrar = await request(ctx.app)
        .delete(`/api/sesiones/${idA}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect([403, 404]).toContain(cerrar.status);
    });

    it('con id invalido devuelve 400', async () => {
      const { token } = await loginComo(ctx.app, 'cliente');
      const res = await request(ctx.app)
        .delete('/api/sesiones/abc')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it('con id inexistente devuelve 404', async () => {
      const { token } = await loginComo(ctx.app, 'cliente');
      const res = await request(ctx.app)
        .delete('/api/sesiones/99999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/sesiones/otras', () => {
    it('cierra todas las sesiones excepto la actual', async () => {
      const t1 = await loginComo(ctx.app, 'cliente');
      const t2 = await loginComo(ctx.app, 'cliente');
      const t3 = await loginComo(ctx.app, 'cliente');
      expect(t1.token).not.toBe(t2.token);
      expect(t2.token).not.toBe(t3.token);

      const cerrar = await request(ctx.app)
        .delete('/api/sesiones/otras')
        .set('Authorization', `Bearer ${t1.token}`);
      expect(cerrar.status).toBe(200);
      expect(cerrar.body.success).toBe(true);
      expect(cerrar.body.sesionesCerradas).toBe(2);

      const lista = await request(ctx.app)
        .get('/api/sesiones')
        .set('Authorization', `Bearer ${t1.token}`);
      expect(lista.body.data.length).toBe(1);
      expect(lista.body.data[0].esActual).toBe(true);
    });

    it('devuelve 0 cerradas cuando no hay otras sesiones', async () => {
      const { token } = await loginComo(ctx.app, 'cliente');
      const cerrar = await request(ctx.app)
        .delete('/api/sesiones/otras')
        .set('Authorization', `Bearer ${token}`);
      expect(cerrar.status).toBe(200);
      expect(cerrar.body.sesionesCerradas).toBe(0);
    });
  });

  describe('flujo entre dispositivos', () => {
    it('cerrar 1 sesion desde el dispositivo A elimina la sesion del dispositivo B', async () => {
      const t1 = await loginComo(ctx.app, 'cliente');
      const t2 = await loginComo(ctx.app, 'cliente');

      const sesiones1 = await request(ctx.app)
        .get('/api/sesiones')
        .set('Authorization', `Bearer ${t1.token}`);
      const otras = sesiones1.body.data.filter((s: any) => !s.esActual);
      const idObjetivo = otras[0].id;

      const cerrar = await request(ctx.app)
        .delete(`/api/sesiones/${idObjetivo}`)
        .set('Authorization', `Bearer ${t1.token}`);
      expect(cerrar.status).toBe(200);

      const sesiones2 = await request(ctx.app)
        .get('/api/sesiones')
        .set('Authorization', `Bearer ${t2.token}`);
      expect([401, 403]).toContain(sesiones2.status);
    });
  });
});
