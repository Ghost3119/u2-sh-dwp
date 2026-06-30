import { Producto } from '../dominio/Producto';
import { db } from './database';
import type BetterSqlite from 'better-sqlite3';

type SqliteDatabase = BetterSqlite.Database;

export class ProductoRepository {
  private conn: SqliteDatabase;

  constructor(conn?: SqliteDatabase) {
    this.conn = conn ?? db.getConn();
  }

  public async obtenerTodos(): Promise<Producto[]> {
    const rows = this.conn
      .prepare(
        `SELECT id, nombre, descripcion, precio, categoria, imagen_url, stock, rating
         FROM productos`
      )
      .all() as Array<{
        id: number;
        nombre: string;
        descripcion: string;
        precio: number;
        categoria: string;
        imagen_url: string;
        stock: number;
        rating: number;
      }>;

    return rows.map((r) =>
      new Producto(
        r.id,
        r.nombre,
        r.descripcion,
        r.precio,
        r.categoria,
        r.imagen_url,
        r.stock,
        r.rating
      )
    );
  }

  public async obtenerPorId(id: number): Promise<Producto | null> {
    const row = this.conn
      .prepare(
        `SELECT id, nombre, descripcion, precio, categoria, imagen_url, stock, rating
         FROM productos WHERE id = ?`
      )
      .get(id) as
      | {
          id: number;
          nombre: string;
          descripcion: string;
          precio: number;
          categoria: string;
          imagen_url: string;
          stock: number;
          rating: number;
        }
      | undefined;

    if (!row) return null;

    return new Producto(
      row.id,
      row.nombre,
      row.descripcion,
      row.precio,
      row.categoria,
      row.imagen_url,
      row.stock,
      row.rating
    );
  }

  public async buscar(termino: string): Promise<Producto[]> {
    const like = `%${termino}%`;
    const rows = this.conn
      .prepare(
        `SELECT id, nombre, descripcion, precio, categoria, imagen_url, stock, rating
         FROM productos
         WHERE LOWER(nombre) LIKE ? OR LOWER(descripcion) LIKE ? OR LOWER(categoria) LIKE ?`
      )
      .all(like, like, like) as Array<{
        id: number;
        nombre: string;
        descripcion: string;
        precio: number;
        categoria: string;
        imagen_url: string;
        stock: number;
        rating: number;
      }>;

    return rows.map((r) =>
      new Producto(
        r.id,
        r.nombre,
        r.descripcion,
        r.precio,
        r.categoria,
        r.imagen_url,
        r.stock,
        r.rating
      )
    );
  }

  public async obtenerCategorias(): Promise<string[]> {
    const rows = this.conn
      .prepare(`SELECT DISTINCT categoria FROM productos ORDER BY categoria ASC`)
      .all() as Array<{ categoria: string }>;
    return rows.map((r) => r.categoria);
  }

  public async descontarStock(
    items: Array<{ productoId: number; cantidad: number }>
  ): Promise<void> {
    const tx = this.conn.transaction(() => {
      for (const it of items) {
        const row = this.conn
          .prepare(`SELECT stock FROM productos WHERE id = ?`)
          .get(it.productoId) as { stock: number } | undefined;
        if (!row) {
          throw new Error(`Producto ${it.productoId} no existe`);
        }
        if (row.stock < it.cantidad) {
          throw new Error(`Stock insuficiente para producto ${it.productoId}`);
        }
        this.conn
          .prepare(`UPDATE productos SET stock = stock - ? WHERE id = ?`)
          .run(it.cantidad, it.productoId);
      }
    });
    tx();
  }
}
