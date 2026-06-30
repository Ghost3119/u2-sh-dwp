import BetterSqlite from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';

type SqliteDatabase = BetterSqlite.Database;

export class Database {
  private connection!: SqliteDatabase;
  private dbPath: string;

  constructor() {
    const dataDir = path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'techstore.db');
  }

  public init(): void {
    this.connection = new BetterSqlite(this.dbPath);
    this.connection.pragma('foreign_keys = ON');
    this.connection.pragma('journal_mode = WAL');

    this.connection.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nombre_completo TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS productos (
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

      CREATE TABLE IF NOT EXISTS sesiones (
        token TEXT PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        total REAL NOT NULL,
        estado TEXT NOT NULL DEFAULT 'completado',
        direccion_envio TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pedido_items (
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
  }

  public getConn(): SqliteDatabase {
    return this.connection;
  }

  public seed(): void {
    if (!this.connection) {
      throw new Error('Database not initialized. Call init() first.');
    }

    const countProductos = this.connection
      .prepare('SELECT COUNT(*) as c FROM productos')
      .get() as { c: number };

    if (countProductos.c === 0) {
      const insertProducto = this.connection.prepare(`
        INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url, stock, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const productosSeed: Array<[string, string, number, string, string, number, number]> = [
        ['Laptop Gamer RTX 4070', 'Potente laptop para gaming y desarrollo con GPU RTX 4070 y 32GB RAM', 28999, 'Electronica', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=300&fit=crop', 15, 4.8],
        ['Auriculares Bluetooth Pro', 'Cancelacion de ruido activa, 40h de bateria, sonido HiFi', 2499, 'Electronica', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop', 50, 4.6],
        ['Teclado Mecanico RGB', 'Switches Cherry MX Red, iluminacion RGB customizable', 1899, 'Electronica', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=300&fit=crop', 30, 4.7],
        ['Silla Ergonomica Premium', 'Soporte lumbar ajustable, material premium, reposabrazos 4D', 5499, 'Muebles', 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&h=300&fit=crop', 20, 4.5],
        ['Monitor 4K 27 pulgadas', 'Resolucion 4K UHD, 144Hz, panel IPS, HDR400', 7999, 'Electronica', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop', 12, 4.9],
        ['Mouse Inalambrico Gamer', 'Sensor optico 26000 DPI, 8 botones programables', 1299, 'Electronica', 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=300&fit=crop', 45, 4.4],
        ['Escritorio Ajustable', 'Altura electrica, superficie de bambu, 140x70cm', 6299, 'Muebles', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop', 8, 4.3],
        ['Camara Web 1080p', 'Auto focus, microfono integrado, ideal streaming', 1599, 'Electronica', 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&h=300&fit=crop', 25, 4.2],
        ['Lampara LED Inteligente', '16 millones de colores, control por app, compatible Alexa', 899, 'Iluminacion', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop', 60, 4.5],
        ['Disco SSD NVMe 1TB', 'Velocidad lectura 7000MB/s, instalacion sencilla', 1899, 'Almacenamiento', 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=300&fit=crop', 35, 4.8],
        ['Mochila Antirrobo', 'Compartimento oculto USB, material impermeable', 1199, 'Accesorios', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop', 40, 4.4],
        ['Cafetera Espresso Pro', '15 bares de presion, vaporizador, deposito 1.5L', 3299, 'Hogar', 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400&h=300&fit=crop', 18, 4.6]
      ];

      const tx = this.connection.transaction((rows: typeof productosSeed) => {
        for (const row of rows) {
          insertProducto.run(...row);
        }
      });
      tx(productosSeed);
    }

    const countUsuarios = this.connection
      .prepare('SELECT COUNT(*) as c FROM usuarios')
      .get() as { c: number };

    if (countUsuarios.c === 0) {
      const hash = bcrypt.hashSync('demo123', 10);
      this.connection
        .prepare(
          `INSERT INTO usuarios (username, email, password_hash, nombre_completo)
           VALUES (?, ?, ?, ?)`
        )
        .run('demo', 'demo@techstore.com', hash, 'Usuario Demo');
    }
  }
}

export const db = new Database();
db.init();
db.seed();
