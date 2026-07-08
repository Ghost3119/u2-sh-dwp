import { Usuario, RolUsuario } from '../dominio/Usuario';
import { db } from './database';
import type BetterSqlite from 'better-sqlite3';

type SqliteDatabase = BetterSqlite.Database;

export interface IFilaUsuarioCompleta {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  nombre_completo: string;
  rol: string | null;
  created_at: string;
}

export class UsuarioRepository {
  private conn: SqliteDatabase;

  constructor(conn?: SqliteDatabase) {
    this.conn = conn ?? db.getConn();
  }

  public crear(
    username: string,
    email: string,
    passwordHash: string,
    nombreCompleto: string,
    rol: RolUsuario = 'cliente'
  ): Usuario {
    const result = this.conn
      .prepare(
        `INSERT INTO usuarios (username, email, password_hash, nombre_completo, rol)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(username, email, passwordHash, nombreCompleto, rol);

    const id = Number(result.lastInsertRowid);
    return this.buscarPorId(id) as Usuario;
  }

  public buscarPorUsername(username: string): Usuario | null {
    const row = this.conn
      .prepare(`SELECT * FROM usuarios WHERE username = ?`)
      .get(username) as IFilaUsuarioCompleta | undefined;
    return row ? Usuario.desdeFila(row) : null;
  }

  public buscarPorEmail(email: string): Usuario | null {
    const row = this.conn
      .prepare(`SELECT * FROM usuarios WHERE email = ?`)
      .get(email) as IFilaUsuarioCompleta | undefined;
    return row ? Usuario.desdeFila(row) : null;
  }

  public buscarPorId(id: number): Usuario | null {
    const row = this.conn
      .prepare(`SELECT * FROM usuarios WHERE id = ?`)
      .get(id) as IFilaUsuarioCompleta | undefined;
    return row ? Usuario.desdeFila(row) : null;
  }

  public listarTodos(): Usuario[] {
    const rows = this.conn
      .prepare(`SELECT * FROM usuarios ORDER BY id ASC`)
      .all() as IFilaUsuarioCompleta[];
    return rows.map((r) => Usuario.desdeFila(r));
  }

  public actualizarPassword(id: number, passwordHash: string): void {
    this.conn
      .prepare(`UPDATE usuarios SET password_hash = ? WHERE id = ?`)
      .run(passwordHash, id);
  }

  public eliminar(id: number): void {
    this.conn.prepare(`DELETE FROM usuarios WHERE id = ?`).run(id);
  }
}
