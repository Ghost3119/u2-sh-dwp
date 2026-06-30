import { Pedido, IPedidoItem, IPedido } from '../dominio/Pedido';
import { db } from './database';
import type BetterSqlite from 'better-sqlite3';

type SqliteDatabase = BetterSqlite.Database;

export interface INuevoPedidoItem {
  productoId: number;
  cantidad: number;
}

export class PedidoRepository {
  private conn: SqliteDatabase;

  constructor(conn?: SqliteDatabase) {
    this.conn = conn ?? db.getConn();
  }

  public crear(
    usuarioId: number,
    items: INuevoPedidoItem[],
    direccionEnvio: string
  ): Pedido {
    if (items.length === 0) {
      throw new Error('El pedido debe tener al menos un item');
    }

    const placeholders = items.map(() => '(?, ?, ?, ?, ?)').join(', ');

    const crearTx = this.conn.transaction((): number => {
      const productoIds = items.map((i) => i.productoId);
      const stmtProductos = this.conn.prepare(
        `SELECT id, nombre, precio FROM productos WHERE id IN (${productoIds
          .map(() => '?')
          .join(',')})`
      );
      const productos = stmtProductos.all(...productoIds) as Array<{
        id: number;
        nombre: string;
        precio: number;
      }>;
      const productoMap = new Map(productos.map((p) => [p.id, p]));

      let total = 0;
      const filas: Array<[number, number, number, number, number]> = [];
      for (const it of items) {
        const p = productoMap.get(it.productoId);
        if (!p) {
          throw new Error(`Producto ${it.productoId} no existe`);
        }
        if (it.cantidad <= 0) {
          throw new Error('Cantidad debe ser mayor a 0');
        }
        const subtotal = p.precio * it.cantidad;
        total += subtotal;
        filas.push([
          0,
          p.id,
          it.cantidad,
          p.precio,
          subtotal
        ]);
      }

      const pedidoRes = this.conn
        .prepare(
          `INSERT INTO pedidos (usuario_id, total, estado, direccion_envio)
           VALUES (?, ?, 'completado', ?)`
        )
        .run(usuarioId, total, direccionEnvio);

      const pedidoId = Number(pedidoRes.lastInsertRowid);

      const stmtItem = this.conn.prepare(
        `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ${placeholders}`
      );
      stmtItem.run(...filas.map((f) => [pedidoId, f[1], f[2], f[3], f[4]]).flat());

      return pedidoId;
    });

    const pedidoId = crearTx();
    const pedido = this.obtenerPorId(pedidoId, usuarioId);
    if (!pedido) {
      throw new Error('No se pudo recuperar el pedido creado');
    }
    return pedido;
  }

  public obtenerPorUsuario(usuarioId: number): Pedido[] {
    const rows = this.conn
      .prepare(
        `SELECT id, usuario_id, total, estado, direccion_envio, created_at
         FROM pedidos WHERE usuario_id = ? ORDER BY id DESC`
      )
      .all(usuarioId) as Array<{
        id: number;
        usuario_id: number;
        total: number;
        estado: string;
        direccion_envio: string;
        created_at: string;
      }>;

    return rows.map((r) => {
      const items = this.obtenerItems(r.id);
      return new Pedido(
        r.id,
        r.usuario_id,
        r.total,
        r.estado,
        r.direccion_envio,
        r.created_at,
        items
      );
    });
  }

  public obtenerPorId(id: number, usuarioId: number): Pedido | null {
    const row = this.conn
      .prepare(
        `SELECT id, usuario_id, total, estado, direccion_envio, created_at
         FROM pedidos WHERE id = ? AND usuario_id = ?`
      )
      .get(id, usuarioId) as
      | {
          id: number;
          usuario_id: number;
          total: number;
          estado: string;
          direccion_envio: string;
          created_at: string;
        }
      | undefined;
    if (!row) return null;
    const items = this.obtenerItems(row.id);
    return new Pedido(
      row.id,
      row.usuario_id,
      row.total,
      row.estado,
      row.direccion_envio,
      row.created_at,
      items
    );
  }

  private obtenerItems(pedidoId: number): IPedidoItem[] {
    const rows = this.conn
      .prepare(
        `SELECT pi.producto_id, p.nombre, pi.cantidad, pi.precio_unitario, pi.subtotal
         FROM pedido_items pi
         INNER JOIN productos p ON p.id = pi.producto_id
         WHERE pi.pedido_id = ?`
      )
      .all(pedidoId) as Array<{
        producto_id: number;
        nombre: string;
        cantidad: number;
        precio_unitario: number;
        subtotal: number;
      }>;

    return rows.map((r) => ({
      productoId: r.producto_id,
      nombre: r.nombre,
      cantidad: r.cantidad,
      precioUnitario: r.precio_unitario,
      subtotal: r.subtotal
    }));
  }
}
