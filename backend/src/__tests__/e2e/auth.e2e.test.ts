import request from 'supertest';
import { construirAppTest, ITestApp } from '../helpers/appTest';

describe('e2e /api/auth', () => {
  let ctx: ITestApp;

  beforeAll(() => {
    ctx = construirAppTest();
  });

  beforeEach(() => {
    ctx.reiniciar();
  });

  describe('POST /api/auth/registro', () => {
    it('registra un usuario nuevo y devuelve 201 con token', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/registro')
        .send({
          username: 'jorgenuevo',
          email: 'jorgenuevo@utc.mx',
          password: 'secreto123',
          nombreCompleto: 'Jorge Jair'
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toEqual(expect.any(String));
      expect(res.body.data.usuario.username).toBe('jorgenuevo');
      expect(res.body.data.usuario.passwordHash).toBeUndefined();
    });

    it('rechaza username duplicado con 409', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/registro')
        .send({
          username: 'demo',
          email: 'otro@utc.mx',
          password: 'secreto123',
          nombreCompleto: 'Duplicado'
        });
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/username/i);
    });

    it('rechaza email duplicado con 409', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/registro')
        .send({
          username: 'otrouser',
          email: 'demo@techstore.com',
          password: 'secreto123',
          nombreCompleto: 'Otro'
        });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/email/i);
    });

    it('rechaza datos invalidos con 400 (email malformado, password corto)', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/registro')
        .send({
          username: 'ab',
          email: 'no-es-email',
          password: '123',
          nombreCompleto: ''
        });
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errores)).toBe(true);
      expect(res.body.errores.length).toBeGreaterThan(0);
    });

    it('rechaza username con caracteres no alfanumericos con 400', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/registro')
        .send({
          username: 'user con espacio',
          email: 'valido@utc.mx',
          password: 'secreto123',
          nombreCompleto: 'Test'
        });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('inicia sesion con credenciales correctas y devuelve token', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/login')
        .send({ username: 'demo', password: 'demo123' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toEqual(expect.any(String));
      expect(res.body.data.usuario.username).toBe('demo');
    });

    it('rechaza password incorrecta con 401', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/login')
        .send({ username: 'demo', password: 'wrongpass' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/credenciales/i);
    });

    it('rechaza usuario inexistente con 401 (no enumeration)', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/login')
        .send({ username: 'noexiste', password: 'cualquiera' });
      expect(res.status).toBe(401);
    });

    it('rechaza falta de campos con 400', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/login')
        .send({ username: 'demo' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('devuelve el perfil con token valido', async () => {
      const login = await request(ctx.app)
        .post('/api/auth/login')
        .send({ username: 'demo', password: 'demo123' });
      const token = login.body.data.token;

      const res = await request(ctx.app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe('demo');
    });

    it('rechaza sin token con 401', async () => {
      const res = await request(ctx.app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token/i);
    });

    it('rechaza token invalido con 401', async () => {
      const res = await request(ctx.app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token-falso-123');
      expect(res.status).toBe(401);
    });

    it('rechaza token con prefijo incorrecto con 401', async () => {
      const res = await request(ctx.app)
        .get('/api/auth/me')
        .set('Authorization', 'Basic abc123');
      expect(res.status).toBe(401);
    });
  });
});
