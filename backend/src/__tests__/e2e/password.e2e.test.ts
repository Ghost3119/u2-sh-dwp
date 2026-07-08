import request from 'supertest';
import { construirAppTest, ITestApp } from '../helpers/appTest';
import { loginComo } from '../helpers/auth.helper';

describe('e2e /api/auth/recuperar y /api/auth/resetear', () => {
  let ctx: ITestApp;

  beforeAll(() => {
    ctx = construirAppTest();
  });

  beforeEach(() => {
    ctx.reiniciar();
  });

  describe('POST /api/auth/recuperar', () => {
    it('con email existente devuelve 200 y token (en entorno no produccion)', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/recuperar')
        .send({ email: 'demo@techstore.com' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mensaje).toMatch(/instrucciones|existe/i);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThanOrEqual(32);
    });

    it('con email inexistente devuelve 200 con mismo mensaje (no filtra existencia)', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/recuperar')
        .send({ email: 'noexiste@utc.mx' });
      expect(res.status).toBe(200);
      expect(res.body.mensaje).toMatch(/instrucciones|existe/i);
      expect(res.body.token).toBeUndefined();
    });

    it('sin email devuelve 400 con errores de validacion', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/recuperar')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(Array.isArray(res.body.errores)).toBe(true);
    });

    it('con email malformado devuelve 400', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/recuperar')
        .send({ email: 'no-es-email' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/resetear', () => {
    let tokenCrudo: string;

    const solicitar = async (email: string): Promise<request.Response> => {
      return request(ctx.app).post('/api/auth/recuperar').send({ email });
    };

    it('con token valido y password nuevo devuelve 200 y actualiza la contrasena', async () => {
      const r1 = await solicitar('demo@techstore.com');
      tokenCrudo = r1.body.token;

      const res = await request(ctx.app)
        .post('/api/auth/resetear')
        .send({ token: tokenCrudo, nuevoPassword: 'secreto789' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mensaje).toMatch(/actualizada|exitosamente/i);

      const login = await request(ctx.app)
        .post('/api/auth/login')
        .send({ username: 'demo', password: 'secreto789' });
      expect(login.status).toBe(200);
    });

    it('con token ya usado devuelve 400', async () => {
      const r1 = await solicitar('demo@techstore.com');
      tokenCrudo = r1.body.token;
      await request(ctx.app)
        .post('/api/auth/resetear')
        .send({ token: tokenCrudo, nuevoPassword: 'secreto789' });
      const reuso = await request(ctx.app)
        .post('/api/auth/resetear')
        .send({ token: tokenCrudo, nuevoPassword: 'otro123' });
      expect([400, 401]).toContain(reuso.status);
      expect(reuso.body.success).toBe(false);
    });

    it('con token expirado devuelve 400/401', async () => {
      const r1 = await solicitar('demo@techstore.com');
      tokenCrudo = r1.body.token;
      ctx.conn
        .prepare('UPDATE password_resets SET expires_at = ?')
        .run('2000-01-01 00:00:00');
      const res = await request(ctx.app)
        .post('/api/auth/resetear')
        .send({ token: tokenCrudo, nuevoPassword: 'secreto789' });
      expect([400, 401]).toContain(res.status);
    });

    it('con password debil (< 6 chars) devuelve 400', async () => {
      const r1 = await solicitar('demo@techstore.com');
      tokenCrudo = r1.body.token;
      const res = await request(ctx.app)
        .post('/api/auth/resetear')
        .send({ token: tokenCrudo, nuevoPassword: 'ab1' });
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errores) || res.body.error).toBeTruthy();
    });

    it('con password sin numeros devuelve 400', async () => {
      const r1 = await solicitar('demo@techstore.com');
      tokenCrudo = r1.body.token;
      const res = await request(ctx.app)
        .post('/api/auth/resetear')
        .send({ token: tokenCrudo, nuevoPassword: 'abcdef' });
      expect(res.status).toBe(400);
    });

    it('con password sin letras devuelve 400', async () => {
      const r1 = await solicitar('demo@techstore.com');
      tokenCrudo = r1.body.token;
      const res = await request(ctx.app)
        .post('/api/auth/resetear')
        .send({ token: tokenCrudo, nuevoPassword: '123456' });
      expect(res.status).toBe(400);
    });

    it('sin token devuelve 400', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/resetear')
        .send({ nuevoPassword: 'secreto789' });
      expect(res.status).toBe(400);
    });

    it('con token inexistente devuelve 400/401', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/resetear')
        .send({ token: 'token-falso-1234567890abcdef', nuevoPassword: 'secreto789' });
      expect([400, 401]).toContain(res.status);
    });

    it('despues de resetear, las sesiones anteriores quedan invalidadas', async () => {
      const loginInicial = await loginComo(ctx.app, 'cliente');
      const me = await request(ctx.app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginInicial.token}`);
      expect(me.status).toBe(200);

      const r1 = await solicitar('demo@techstore.com');
      tokenCrudo = r1.body.token;
      await request(ctx.app)
        .post('/api/auth/resetear')
        .send({ token: tokenCrudo, nuevoPassword: 'nuevapass9' });

      const meDespues = await request(ctx.app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginInicial.token}`);
      expect([401, 403]).toContain(meDespues.status);
    });
  });
});
