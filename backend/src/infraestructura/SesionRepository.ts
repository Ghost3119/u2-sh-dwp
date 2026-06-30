import { db } from './database';
import type BetterSqlite from 'better-sqlite3';

type SqliteDatabase = BetterSqlite.Database;

export interface ISesionConUsuario {
  token: string;
  usuarioId: number;
  username: string;
  email: string;
  nombreCompleto: string;
  expiresAt: string;
}

export class SesionRepository {
  private conn: SqliteDatabase;

  constructor(conn?: SqliteDatabase) {
    this.conn = conn ?? db.getConn();
  }

  public crear(token: string, usuarioId: number, expiresAt: string): void {
    this.conn
      .prepare(
        `INSERT INTO sesiones (token, usuario_id, expires_at) VALUES (?, ?, ?)`
      )
      .run(token, usuarioId, expiresAt);
  }

  public buscar(token: string): ISesionConUsuario | null {
    const row = this.conn
      .prepare(
        `SELECT s.token, s.usuario_id, s.expires_at,
                u.username, u.email, u.nombre_completo
         FROM sesiones s
         INNER JOIN usuarios u ON u.id = s.usuario_id
         WHERE s.token = ?`
      )
      .get(token) as
      | {
          token: string;
          usuario_id: number;
          expires_at: string;
          username: string;
          email: string;
          nombre_completo: string;
        }
      | undefined;

    if (!row) return null;

    return {
      token: row.token,
      usuarioId: row.usuario_id,
      username: row.username,
      email: row.email,
      nombreCompleto: row.nombre_completo,
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
}
