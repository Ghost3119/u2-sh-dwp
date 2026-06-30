import { Usuario } from '../dominio/Usuario';
import { db } from './database';
import type BetterSqlite from 'better-sqlite3';

type SqliteDatabase = BetterSqlite.Database;

export class UsuarioRepository {
  private conn: SqliteDatabase;

  constructor(conn?: SqliteDatabase) {
    this.conn = conn ?? db.getConn();
  }

  public crear(
    username: string,
    email: string,
    passwordHash: string,
    nombreCompleto: string
  ): Usuario {
    const result = this.conn
      .prepare(
        `INSERT INTO usuarios (username, email, password_hash, nombre_completo)
         VALUES (?, ?, ?, ?)`
      )
      .run(username, email, passwordHash, nombreCompleto);

    const id = Number(result.lastInsertRowid);
    return this.buscarPorId(id) as Usuario;
  }

  public buscarPorUsername(username: string): Usuario | null {
    const row = this.conn
      .prepare(`SELECT * FROM usuarios WHERE username = ?`)
      .get(username) as
      | {
          id: number;
          username: string;
          email: string;
          password_hash: string;
          nombre_completo: string;
          created_at: string;
        }
      | undefined;
    return row ? Usuario.desdeFila(row) : null;
  }

  public buscarPorEmail(email: string): Usuario | null {
    const row = this.conn
      .prepare(`SELECT * FROM usuarios WHERE email = ?`)
      .get(email) as
      | {
          id: number;
          username: string;
          email: string;
          password_hash: string;
          nombre_completo: string;
          created_at: string;
        }
      | undefined;
    return row ? Usuario.desdeFila(row) : null;
  }

  public buscarPorId(id: number): Usuario | null {
    const row = this.conn
      .prepare(`SELECT * FROM usuarios WHERE id = ?`)
      .get(id) as
      | {
          id: number;
          username: string;
          email: string;
          password_hash: string;
          nombre_completo: string;
          created_at: string;
        }
      | undefined;
    return row ? Usuario.desdeFila(row) : null;
  }
}
