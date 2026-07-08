import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PasswordResetService, PasswordResetError } from '../../aplicacion/PasswordResetService';
import { UsuarioRepository } from '../../infraestructura/UsuarioRepository';
import { PasswordResetRepository } from '../../infraestructura/PasswordResetRepository';
import { SesionRepository } from '../../infraestructura/SesionRepository';
import { crearBDTest, seedUsuarioDemo, limpiarTablas } from '../helpers/dbTest';
import BetterSqlite from 'better-sqlite3';

type SqliteDatabase = BetterSqlite.Database;

const TOKEN_HASH_RE = /^[a-f0-9]{64}$/;

describe('PasswordResetService (backend/aplicacion)', () => {
  let conn: SqliteDatabase;
  let usuarioRepo: UsuarioRepository;
  let passwordResetRepo: PasswordResetRepository;
  let sesionRepo: SesionRepository;
  let service: PasswordResetService;

  beforeEach(() => {
    conn = crearBDTest();
    usuarioRepo = new UsuarioRepository(conn);
    passwordResetRepo = new PasswordResetRepository(conn);
    sesionRepo = new SesionRepository(conn);
    service = new PasswordResetService(usuarioRepo, passwordResetRepo, sesionRepo);
    seedUsuarioDemo(conn, 'demo');
  });

  afterEach(() => {
    conn.close();
  });

  describe('solicitarRecuperacion()', () => {
    it('genera un token aleatorio unico para un email existente', async () => {
      const resultado = await service.solicitarRecuperacion('demo@techstore.com');
      expect(resultado.tokenCrudo).toBeDefined();
      expect(typeof resultado.tokenCrudo).toBe('string');
      expect(resultado.tokenCrudo!.length).toBeGreaterThanOrEqual(32);
    });

    it('hashea el token con SHA-256 (64 hex chars) antes de almacenarlo', async () => {
      await service.solicitarRecuperacion('demo@techstore.com');
      const registros = conn.prepare('SELECT * FROM password_resets').all() as any[];
      expect(registros).toHaveLength(1);
      expect(registros[0].token_hash).toMatch(TOKEN_HASH_RE);
    });

    it('cada solicitud genera un token distinto (aleatoriedad)', async () => {
      const a = await service.solicitarRecuperacion('demo@techstore.com');
      const b = await service.solicitarRecuperacion('demo@techstore.com');
      expect(a.tokenCrudo).not.toBe(b.tokenCrudo);
      const registros = conn.prepare('SELECT * FROM password_resets').all() as any[];
      expect(registros.length).toBeGreaterThanOrEqual(2);
    });

    it('no filtra existencia: email inexistente devuelve el mismo mensaje generico', async () => {
      const resultado = await service.solicitarRecuperacion('noexiste@utc.mx');
      expect(resultado.mensajeExito).toMatch(/instrucciones|existe/i);
      expect(resultado.tokenCrudo).toBeUndefined();
      const registros = conn.prepare('SELECT * FROM password_resets').all() as any[];
      expect(registros).toHaveLength(0);
    });

    it('asocia el registro al usuario correcto', async () => {
      const usuarioId = Number(
        (conn.prepare('SELECT id FROM usuarios WHERE username = ?').get('demo') as any).id
      );
      await service.solicitarRecuperacion('demo@techstore.com');
      const reg = conn.prepare('SELECT * FROM password_resets').get() as any;
      expect(reg.usuario_id).toBe(usuarioId);
    });
  });

  describe('resetearPassword()', () => {
    it('actualiza la contrasena cuando el token es valido', async () => {
      const { tokenCrudo } = await service.solicitarRecuperacion('demo@techstore.com');
      const resultado = await service.resetearPassword(tokenCrudo!, 'nueva123');
      expect(resultado.mensajeExito).toMatch(/actualizada|exitosamente/i);
      const usuario = usuarioRepo.buscarPorUsername('demo');
      const ok = await bcrypt.compare('nueva123', usuario!.passwordHash);
      expect(ok).toBe(true);
    });

    it('marca el token como usado al consumirlo', async () => {
      const { tokenCrudo } = await service.solicitarRecuperacion('demo@techstore.com');
      await service.resetearPassword(tokenCrudo!, 'nueva123');
      const reg = conn.prepare('SELECT * FROM password_resets').get() as any;
      expect(reg.usado).toBe(1);
    });

    it('rechaza un token ya utilizado', async () => {
      const { tokenCrudo } = await service.solicitarRecuperacion('demo@techstore.com');
      await service.resetearPassword(tokenCrudo!, 'nueva123');
      await expect(service.resetearPassword(tokenCrudo!, 'otra456')).rejects.toBeInstanceOf(
        PasswordResetError
      );
    });

    it('rechaza un token expirado', async () => {
      const { tokenCrudo } = await service.solicitarRecuperacion('demo@techstore.com');
      conn.prepare('UPDATE password_resets SET expires_at = ?').run('2000-01-01 00:00:00');
      await expect(service.resetearPassword(tokenCrudo!, 'nueva123')).rejects.toBeInstanceOf(
        PasswordResetError
      );
    });

    it('rechaza contrasena con menos de 6 caracteres', async () => {
      const { tokenCrudo } = await service.solicitarRecuperacion('demo@techstore.com');
      await expect(service.resetearPassword(tokenCrudo!, 'abc1')).rejects.toBeInstanceOf(
        PasswordResetError
      );
      try {
        await service.resetearPassword(tokenCrudo!, 'abc1');
      } catch (e: any) {
        expect(e.status).toBe(400);
      }
    });

    it('rechaza contrasena sin letras (solo numeros)', async () => {
      const { tokenCrudo } = await service.solicitarRecuperacion('demo@techstore.com');
      await expect(service.resetearPassword(tokenCrudo!, '123456')).rejects.toBeInstanceOf(
        PasswordResetError
      );
    });

    it('rechaza contrasena sin numeros (solo letras)', async () => {
      const { tokenCrudo } = await service.solicitarRecuperacion('demo@techstore.com');
      await expect(service.resetearPassword(tokenCrudo!, 'abcdef')).rejects.toBeInstanceOf(
        PasswordResetError
      );
    });

    it('acepta contrasena con letras y numeros de al menos 6 chars', async () => {
      const { tokenCrudo } = await service.solicitarRecuperacion('demo@techstore.com');
      const r = await service.resetearPassword(tokenCrudo!, 'abc123');
      expect(r.mensajeExito).toBeDefined();
    });

    it('rechaza token vacio o inexistente', async () => {
      await expect(service.resetearPassword('', 'nueva123')).rejects.toBeInstanceOf(
        PasswordResetError
      );
      await expect(service.resetearPassword('token-falso-1234567890', 'nueva123')).rejects.toBeInstanceOf(
        PasswordResetError
      );
    });

    it('invalida todas las sesiones del usuario tras reset exitoso', async () => {
      const { tokenCrudo } = await service.solicitarRecuperacion('demo@techstore.com');
      const usuarioId = Number(
        (conn.prepare('SELECT id FROM usuarios WHERE username = ?').get('demo') as any).id
      );
      const expira = new Date();
      expira.setDate(expira.getDate() + 7);
      sesionRepo.crear('t1', usuarioId, expira.toISOString());
      sesionRepo.crear('t2', usuarioId, expira.toISOString());
      expect(conn.prepare('SELECT COUNT(*) as c FROM sesiones').get()).toEqual({ c: 2 });

      await service.resetearPassword(tokenCrudo!, 'nueva123');
      const restantes = conn.prepare('SELECT COUNT(*) as c FROM sesiones').get() as any;
      expect(restantes.c).toBe(0);
    });
  });
});
