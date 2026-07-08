import BetterSqlite from 'better-sqlite3';
import * as bcrypt from 'bcryptjs';

type SqliteDatabase = BetterSqlite.Database;

export function crearBDTest(nombre: string = ':memory:'): SqliteDatabase {
  const conn = new BetterSqlite(nombre);
  conn.pragma('foreign_keys = ON');

  conn.exec(`
    CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre_completo TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin', 'cliente')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      precio REAL NOT NULL,
      categoria TEXT NOT NULL,
      imagen_url TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE sesiones (
      token TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      dispositivo TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
    CREATE TABLE password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      usado INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
    CREATE TABLE pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      total REAL NOT NULL,
      estado TEXT NOT NULL DEFAULT 'completado',
      direccion_envio TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
    CREATE TABLE pedido_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    );
  `);

  return conn;
}

export function seedUsuario(
  conn: SqliteDatabase,
  datos: {
    username?: string;
    email?: string;
    password?: string;
    nombreCompleto?: string;
    rol?: 'admin' | 'cliente';
  } = {}
): number {
  const username = datos.username ?? 'demo';
  const password = datos.password ?? 'demo123';
  const email = datos.email ?? `${username}@techstore.com`;
  const nombreCompleto = datos.nombreCompleto ?? 'Usuario Demo';
  const rol = datos.rol ?? 'cliente';
  const hash = bcrypt.hashSync(password, 10);
  const res = conn
    .prepare(
      'INSERT INTO usuarios (username, email, password_hash, nombre_completo, rol) VALUES (?, ?, ?, ?, ?)'
    )
    .run(username, email, hash, nombreCompleto, rol);
  return Number(res.lastInsertRowid);
}

export function seedUsuarioDemo(conn: SqliteDatabase, username = 'demo'): number {
  return seedUsuario(conn, { username, rol: 'cliente' });
}

export function seedUsuarioAdmin(conn: SqliteDatabase, username = 'admin'): number {
  return seedUsuario(conn, {
    username,
    email: `${username}@techstore.com`,
    password: 'admin123',
    nombreCompleto: 'Administrador',
    rol: 'admin'
  });
}

export function seedProducto(
  conn: SqliteDatabase,
  data: {
    nombre: string;
    descripcion?: string;
    precio: number;
    categoria: string;
    imagen_url?: string;
    stock?: number;
    rating?: number;
  }
): number {
  const res = conn
    .prepare(
      'INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url, stock, rating) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      data.nombre,
      data.descripcion ?? 'desc',
      data.precio,
      data.categoria,
      data.imagen_url ?? 'https://img.test/x.jpg',
      data.stock ?? 10,
      data.rating ?? 4.0
    );
  return Number(res.lastInsertRowid);
}

export function limpiarTablas(conn: SqliteDatabase): void {
  conn.exec(`
    DELETE FROM pedido_items;
    DELETE FROM pedidos;
    DELETE FROM password_resets;
    DELETE FROM sesiones;
    DELETE FROM productos;
    DELETE FROM usuarios;
    DELETE FROM sqlite_sequence;
  `);
}
