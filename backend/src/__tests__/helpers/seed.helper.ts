import * as bcrypt from 'bcryptjs';
import type BetterSqlite from 'better-sqlite3';

type SqliteDatabase = BetterSqlite.Database;

export interface IUsuarioSeed {
  id?: number;
  username: string;
  email?: string;
  password?: string;
  nombreCompleto?: string;
  rol?: 'admin' | 'cliente';
}

export interface IProductoSeed {
  id?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria: string;
  imagen_url?: string;
  stock?: number;
  rating?: number;
}

export function seedUsuarioEn(
  conn: SqliteDatabase,
  datos: IUsuarioSeed
): number {
  const username = datos.username;
  const email = datos.email ?? `${username}@techstore.com`;
  const password = datos.password ?? 'pass1234';
  const nombreCompleto = datos.nombreCompleto ?? username;
  const rol = datos.rol ?? 'cliente';
  const hash = bcrypt.hashSync(password, 4);
  const res = conn
    .prepare(
      'INSERT INTO usuarios (username, email, password_hash, nombre_completo, rol) VALUES (?, ?, ?, ?, ?)'
    )
    .run(username, email, hash, nombreCompleto, rol);
  return Number(res.lastInsertRowid);
}

export function seedProductoEn(
  conn: SqliteDatabase,
  datos: IProductoSeed
): number {
  const res = conn
    .prepare(
      `INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url, stock, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      datos.nombre,
      datos.descripcion ?? 'desc',
      datos.precio,
      datos.categoria,
      datos.imagen_url ?? 'https://img.test/x.jpg',
      datos.stock ?? 10,
      datos.rating ?? 4.0
    );
  return Number(res.lastInsertRowid);
}

export function seedAdmin(conn: SqliteDatabase, username = 'admin'): number {
  return seedUsuarioEn(conn, {
    username,
    email: `${username}@techstore.com`,
    password: 'admin123',
    nombreCompleto: 'Administrador',
    rol: 'admin'
  });
}

export function seedCliente(conn: SqliteDatabase, username = 'clienteTest'): number {
  return seedUsuarioEn(conn, {
    username,
    email: `${username}@techstore.com`,
    password: 'cliente123',
    nombreCompleto: 'Cliente de Test',
    rol: 'cliente'
  });
}
