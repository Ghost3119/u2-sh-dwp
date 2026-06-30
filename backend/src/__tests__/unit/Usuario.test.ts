import { Usuario } from '../../dominio/Usuario';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe('Usuario (backend/dominio)', () => {
  describe('constructor', () => {
    it('crea un usuario con sus propiedades', () => {
      const u = new Usuario(1, 'jorge', 'jorge@utc.mx', 'hash123', 'Jorge Jair', '2026-01-01');
      expect(u.id).toBe(1);
      expect(u.username).toBe('jorge');
      expect(u.email).toBe('jorge@utc.mx');
      expect(u.passwordHash).toBe('hash123');
      expect(u.nombreCompleto).toBe('Jorge Jair');
    });
  });

  describe('obtenerIniciales()', () => {
    it('obtiene las primeras letras de los primeros dos nombres', () => {
      const u = new Usuario(1, 'a', 'a@a.com', 'h', 'Jorge Jair Camacho Ibarra', '2026-01-01');
      expect(u.obtenerIniciales()).toBe('JJ');
    });

    it('maneja un solo nombre', () => {
      const u = new Usuario(1, 'a', 'a@a.com', 'h', 'Jorge', '2026-01-01');
      expect(u.obtenerIniciales()).toBe('J');
    });

    it('maneja nombres con espacios extra', () => {
      const u = new Usuario(1, 'a', 'a@a.com', 'h', '  Maria   Lopez ', '2026-01-01');
      expect(u.obtenerIniciales()).toBe('ML');
    });
  });

  describe('toDTO()', () => {
    it('omite el passwordHash en la respuesta publica', () => {
      const u = new Usuario(1, 'jorge', 'jorge@utc.mx', 'super-secret-hash', 'Jorge', '2026-01-01');
      const dto = u.toDTO();
      expect(dto).not.toHaveProperty('passwordHash');
      expect(dto).toEqual({
        id: 1,
        username: 'jorge',
        email: 'jorge@utc.mx',
        nombreCompleto: 'Jorge',
        createdAt: '2026-01-01'
      });
    });
  });

  describe('desdeFila()', () => {
    it('mapea snake_case de la BD a camelCase de la entidad', () => {
      const u = Usuario.desdeFila({
        id: 7,
        username: 'demo',
        email: 'demo@utc.mx',
        password_hash: 'bcrypt-hash',
        nombre_completo: 'Usuario Demo',
        created_at: '2026-01-01 12:00:00'
      });
      expect(u).toBeInstanceOf(Usuario);
      expect(u.id).toBe(7);
      expect(u.passwordHash).toBe('bcrypt-hash');
      expect(u.nombreCompleto).toBe('Usuario Demo');
    });
  });

  describe('validacion de email (logica de negocio externa)', () => {
    it('considera validos los emails con formato correcto', () => {
      const validos = ['jorge@utc.mx', 'a.b+tag@example.com', 'user123@sub.domain.io'];
      validos.forEach((e) => {
        expect(EMAIL_REGEX.test(e)).toBe(true);
      });
    });

    it('considera invalidos los emails mal formados', () => {
      const invalidos = ['', 'sinArroba', '@sinUsuario.com', 'user@', 'user @espacio.com', 'user@x', 'a@b@c.com'];
      invalidos.forEach((e) => {
        expect(EMAIL_REGEX.test(e)).toBe(false);
      });
    });
  });
});
