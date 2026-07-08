import { db } from './database';
import type BetterSqlite from 'better-sqlite3';

type SqliteDatabase = BetterSqlite.Database;

export interface ISesionConUsuario {
  token: string;
  usuarioId: number;
  username: string;
  email: string;
  nombreCompleto: string;
  rol: string | null;
  dispositivo: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface ISesionListado {
  id: number;
  token: string;
  dispositivo: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export class SesionRepository {
  private conn: SqliteDatabase;

  constructor(conn?: SqliteDatabase) {
    this.conn = conn ?? db.getConn();
  }

  public crear(
    token: string,
    usuarioId: number,
    expiresAt: string,
    dispositivo: string | null = null,
    ip: string | null = null,
    userAgent: string | null = null
  ): void {
    this.conn
      .prepare(
        `INSERT INTO sesiones (token, usuario_id, expires_at, dispositivo, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(token, usuarioId, expiresAt, dispositivo, ip, userAgent);
  }

  public buscar(token: string): ISesionConUsuario | null {
    const row = this.conn
      .prepare(
        `SELECT s.token, s.usuario_id, s.expires_at, s.dispositivo, s.ip, s.user_agent, s.created_at,
                u.username, u.email, u.nombre_completo, u.rol
         FROM sesiones s
         INNER JOIN usuarios u ON u.id = s.usuario_id
         WHERE s.token = ?`
      )
      .get(token) as
      | {
          token: string;
          usuario_id: number;
          expires_at: string;
          dispositivo: string | null;
          ip: string | null;
          user_agent: string | null;
          created_at: string;
          username: string;
          email: string;
          nombre_completo: string;
          rol: string | null;
        }
      | undefined;

    if (!row) return null;

    return {
      token: row.token,
      usuarioId: row.usuario_id,
      username: row.username,
      email: row.email,
      nombreCompleto: row.nombre_completo,
      rol: row.rol,
      dispositivo: row.dispositivo,
      ip: row.ip,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      expiresAt: row.expires_at
    };
  }

  public eliminar(token: string): void {
    this.conn.prepare(`DELETE FROM sesiones WHERE token = ?`).run(token);
  }

  public eliminarExpiradas(): void {
    this.conn
      .prepare(`DELETE FROM sesiones WHERE expires_at < datetime('now')`)
      .run();
  }

  public eliminarPorUsuario(usuarioId: number): void {
    this.conn.prepare(`DELETE FROM sesiones WHERE usuario_id = ?`).run(usuarioId);
  }

  public obtenerPorUsuario(usuarioId: number): ISesionListado[] {
    const rows = this.conn
      .prepare(
        `SELECT rowid as id, token, dispositivo, ip, user_agent, created_at, expires_at
         FROM sesiones
         WHERE usuario_id = ? AND expires_at > datetime('now')
         ORDER BY created_at DESC`
      )
      .all(usuarioId) as Array<{
        id: number;
        token: string;
        dispositivo: string | null;
        ip: string | null;
        user_agent: string | null;
        created_at: string;
        expires_at: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      token: r.token,
      dispositivo: r.dispositivo,
      ip: r.ip,
      userAgent: r.user_agent,
      createdAt: r.created_at,
      expiresAt: r.expires_at
    }));
  }

  public cerrarOtras(usuarioId: number, tokenActual: string): number {
    const result = this.conn
      .prepare(
        `DELETE FROM sesiones WHERE usuario_id = ? AND token != ?`
      )
      .run(usuarioId, tokenActual);
    return Number(result.changes);
  }

  public cerrar(id: number, usuarioId: number): boolean {
    const result = this.conn
      .prepare(
        `DELETE FROM sesiones WHERE rowid = ? AND usuario_id = ?`
      )
      .run(id, usuarioId);
    return Number(result.changes) > 0;
  }

  public obtenerPorUsuarioCompleto(usuarioId: number): ISesionListado[] {
    return this.obtenerPorUsuario(usuarioId);
  }
}
