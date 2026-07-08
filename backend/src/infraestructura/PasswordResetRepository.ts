import { db } from './database';
import type BetterSqlite from 'better-sqlite3';

type SqliteDatabase = BetterSqlite.Database;

export interface IPasswordReset {
  id: number;
  usuarioId: number;
  tokenHash: string;
  expiresAt: string;
  usado: number;
  createdAt: string;
  email?: string;
  username?: string;
  nombreCompleto?: string;
}

export class PasswordResetRepository {
  private conn: SqliteDatabase;

  constructor(conn?: SqliteDatabase) {
    this.conn = conn ?? db.getConn();
  }

  public crear(usuarioId: number, tokenHash: string, expiresAt: string): IPasswordReset {
    const result = this.conn
      .prepare(
        `INSERT INTO password_resets (usuario_id, token_hash, expires_at)
         VALUES (?, ?, ?)`
      )
      .run(usuarioId, tokenHash, expiresAt);
    return this.buscarPorId(Number(result.lastInsertRowid)) as IPasswordReset;
  }

  public buscarPorId(id: number): IPasswordReset | null {
    const row = this.conn
      .prepare(`SELECT * FROM password_resets WHERE id = ?`)
      .get(id) as
      | {
          id: number;
          usuario_id: number;
          token_hash: string;
          expires_at: string;
          usado: number;
          created_at: string;
        }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      usuarioId: row.usuario_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      usado: row.usado,
      createdAt: row.created_at
    };
  }

  public buscarPorTokenHash(tokenHash: string): IPasswordReset | null {
    const row = this.conn
      .prepare(
        `SELECT pr.id, pr.usuario_id, pr.token_hash, pr.expires_at, pr.usado, pr.created_at,
                u.email, u.username, u.nombre_completo
         FROM password_resets pr
         INNER JOIN usuarios u ON u.id = pr.usuario_id
         WHERE pr.token_hash = ?`
      )
      .get(tokenHash) as
      | {
          id: number;
          usuario_id: number;
          token_hash: string;
          expires_at: string;
          usado: number;
          created_at: string;
          email: string;
          username: string;
          nombre_completo: string;
        }
      | undefined;

    if (!row) return null;
    return {
      id: row.id,
      usuarioId: row.usuario_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      usado: row.usado,
      createdAt: row.created_at,
      email: row.email,
      username: row.username,
      nombreCompleto: row.nombre_completo
    };
  }

  public marcarUsado(id: number): void {
    this.conn
      .prepare(`UPDATE password_resets SET usado = 1 WHERE id = ?`)
      .run(id);
  }

  public eliminarExpirados(): number {
    const result = this.conn
      .prepare(`DELETE FROM password_resets WHERE expires_at < datetime('now') OR usado = 1`)
      .run();
    return Number(result.changes);
  }
}
