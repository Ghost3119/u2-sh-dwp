import { Usuario, RolUsuario } from '../../dominio/Usuario';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe('Usuario (backend/dominio)', () => {
  describe('constructor', () => {
    it('crea un usuario con sus propiedades', () => {
      const u = new Usuario(1, 'jorge', 'jorge@utc.mx', 'hash123', 'Jorge Jair', 'cliente', '2026-01-01');
      expect(u.id).toBe(1);
      expect(u.username).toBe('jorge');
      expect(u.email).toBe('jorge@utc.mx');
      expect(u.passwordHash).toBe('hash123');
      expect(u.nombreCompleto).toBe('Jorge Jair');
      expect(u.rol).toBe('cliente');
      expect(u.createdAt).toBe('2026-01-01');
    });

    it('asigna rol "cliente" por defecto', () => {
      const u = new Usuario(1, 'a', 'a@a.com', 'h', 'Juan');
      expect(u.rol).toBe('cliente');
    });
  });

  describe('obtenerIniciales()', () => {
    it('obtiene las primeras letras de los primeros dos nombres', () => {
      const u = new Usuario(1, 'a', 'a@a.com', 'h', 'Jorge Jair Camacho Ibarra');
      expect(u.obtenerIniciales()).toBe('JJ');
    });

    it('maneja un solo nombre', () => {
      const u = new Usuario(1, 'a', 'a@a.com', 'h', 'Jorge');
      expect(u.obtenerIniciales()).toBe('J');
    });

    it('maneja nombres con espacios extra', () => {
      const u = new Usuario(1, 'a', 'a@a.com', 'h', '  Maria   Lopez ');
      expect(u.obtenerIniciales()).toBe('ML');
    });
  });

  describe('toDTO()', () => {
    it('omite el passwordHash en la respuesta publica', () => {
      const u = new Usuario(1, 'jorge', 'jorge@utc.mx', 'super-secret-hash', 'Jorge', 'cliente', '2026-01-01');
      const dto = u.toDTO();
      expect(dto).not.toHaveProperty('passwordHash');
      expect(dto).toEqual({
        id: 1,
        username: 'jorge',
        email: 'jorge@utc.mx',
        nombreCompleto: 'Jorge',
        rol: 'cliente',
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
        rol: 'cliente',
        created_at: '2026-01-01 12:00:00'
      });
      expect(u).toBeInstanceOf(Usuario);
      expect(u.id).toBe(7);
      expect(u.passwordHash).toBe('bcrypt-hash');
      expect(u.nombreCompleto).toBe('Usuario Demo');
      expect(u.rol).toBe('cliente');
    });

    it('normaliza rol invalido a "cliente"', () => {
      const u = Usuario.desdeFila({
        id: 8,
        username: 'x',
        email: 'x@x.com',
        password_hash: 'h',
        nombre_completo: 'X',
        rol: 'superadmin',
        created_at: '2026-01-01'
      } as any);
      expect(u.rol).toBe('cliente');
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

  describe('Rol de usuario', () => {
    it('un usuario con rol "admin" puede identificarse como admin', () => {
      const admin = new Usuario(1, 'admin', 'a@a.com', 'h', 'Admin', 'admin');
      const cliente = new Usuario(2, 'cli', 'c@c.com', 'h', 'Cli', 'cliente');
      expect(admin.rol).toBe('admin');
      expect(cliente.rol).toBe('cliente');
      expect(admin.rol === 'admin').toBe(true);
      expect(cliente.rol === 'admin').toBe(false);
    });

    it('el tipo RolUsuario solo permite "admin" o "cliente"', () => {
      const rolesValidos: RolUsuario[] = ['admin', 'cliente'];
      expect(rolesValidos).toContain('admin');
      expect(rolesValidos).toContain('cliente');
      expect(rolesValidos).toHaveLength(2);
    });
  });
});
