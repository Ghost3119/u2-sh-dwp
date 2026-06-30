import request from 'supertest';
import { construirAppTest, ITestApp } from '../helpers/appTest';

describe('e2e /api/productos', () => {
  let ctx: ITestApp;

  beforeAll(() => {
    ctx = construirAppTest();
  });

  beforeEach(() => {
    ctx.reiniciar();
  });

  describe('GET /api/productos', () => {
    it('lista todos los productos', async () => {
      const res = await request(ctx.app).get('/api/productos');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.total).toBe(3);
      expect(res.body.data[0]).toHaveProperty('nombre');
      expect(res.body.data[0]).toHaveProperty('precio');
    });
  });

  describe('GET /api/productos/:id', () => {
    it('obtiene un producto por id', async () => {
      const res = await request(ctx.app).get('/api/productos/1');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.nombre).toBe('Laptop Gamer');
    });

    it('devuelve 404 si el producto no existe', async () => {
      const res = await request(ctx.app).get('/api/productos/9999');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/no encontrado/i);
    });

    it('devuelve 400 si el id no es valido', async () => {
      const res = await request(ctx.app).get('/api/productos/abc');
      expect(res.status).toBe(400);
    });

    it('devuelve 400 si el id es negativo', async () => {
      const res = await request(ctx.app).get('/api/productos/-5');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/buscar', () => {
    it('busca por termino y devuelve coincidencias', async () => {
      const res = await request(ctx.app).get('/api/buscar').query({ q: 'laptop' });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.termino).toBe('laptop');
    });

    it('busqueda vacia devuelve todos los productos', async () => {
      const res = await request(ctx.app).get('/api/buscar');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });

    it('busqueda sin resultados devuelve arreglo vacio', async () => {
      const res = await request(ctx.app).get('/api/buscar').query({ q: 'noexiste' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });
  });

  describe('GET /api/categorias', () => {
    it('lista las categorias unicas', async () => {
      const res = await request(ctx.app).get('/api/categorias');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(expect.arrayContaining(['Electronica', 'Accesorios', 'Muebles']));
    });
  });
});
