import { Pedido, IPedidoItem, IPedido } from '../dominio/Pedido';
import { db } from './database';
import type BetterSqlite from 'better-sqlite3';

type SqliteDatabase = BetterSqlite.Database;

export interface INuevoPedidoItem {
  productoId: number;
  cantidad: number;
}

export interface IPedidoAdminItem extends IPedidoItem {
  imagen: string;
}

export interface IPedidoAdmin extends IPedido {
  usuarioId: number;
  username: string;
  email: string;
  nombreCompleto: string;
  items: IPedidoAdminItem[];
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

  public obtenerTodos(): IPedidoAdmin[] {
    const rows = this.conn
      .prepare(
        `SELECT p.id, p.usuario_id, p.total, p.estado, p.direccion_envio, p.created_at,
                u.username, u.email, u.nombre_completo
         FROM pedidos p
         INNER JOIN usuarios u ON u.id = p.usuario_id
         ORDER BY p.id DESC`
      )
      .all() as Array<{
        id: number;
        usuario_id: number;
        total: number;
        estado: string;
        direccion_envio: string;
        created_at: string;
        username: string;
        email: string;
        nombre_completo: string;
      }>;

    return rows.map((r) => {
      const items = this.obtenerItemsAdmin(r.id);
      return {
        id: r.id,
        usuarioId: r.usuario_id,
        username: r.username,
        email: r.email,
        nombreCompleto: r.nombre_completo,
        total: r.total,
        estado: r.estado,
        direccionEnvio: r.direccion_envio,
        createdAt: r.created_at,
        items
      };
    });
  }

  public actualizarEstado(id: number, estado: string): boolean {
    const result = this.conn
      .prepare(`UPDATE pedidos SET estado = ? WHERE id = ?`)
      .run(estado, id);
    return Number(result.changes) > 0;
  }

  public contarTodos(): number {
    const row = this.conn.prepare(`SELECT COUNT(*) as c FROM pedidos`).get() as { c: number };
    return row.c;
  }

  public contarPorEstado(): Array<{ estado: string; total: number }> {
    const rows = this.conn
      .prepare(`SELECT estado, COUNT(*) as total FROM pedidos GROUP BY estado`)
      .all() as Array<{ estado: string; total: number }>;
    return rows;
  }

  public totalIngresos(): number {
    const row = this.conn
      .prepare(`SELECT COALESCE(SUM(total), 0) as total FROM pedidos WHERE estado != 'cancelado'`)
      .get() as { total: number };
    return row.total;
  }

  public topProductosVendidos(limite: number = 5): Array<{ productoId: number; nombre: string; totalVendidos: number; ingresos: number }> {
    const rows = this.conn
      .prepare(
        `SELECT pi.producto_id, p.nombre, SUM(pi.cantidad) as totalVendidos, SUM(pi.subtotal) as ingresos
         FROM pedido_items pi
         INNER JOIN pedidos pe ON pe.id = pi.pedido_id
         INNER JOIN productos p ON p.id = pi.producto_id
         WHERE pe.estado != 'cancelado'
         GROUP BY pi.producto_id, p.nombre
         ORDER BY totalVendidos DESC
         LIMIT ?`
      )
      .all(limite) as Array<{
        producto_id: number;
        nombre: string;
        totalVendidos: number;
        ingresos: number;
      }>;
    return rows.map((r) => ({
      productoId: r.producto_id,
      nombre: r.nombre,
      totalVendidos: r.totalVendidos,
      ingresos: r.ingresos
    }));
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

  private obtenerItemsAdmin(pedidoId: number): IPedidoAdminItem[] {
    const rows = this.conn
      .prepare(
        `SELECT pi.producto_id, p.nombre, p.imagen_url, pi.cantidad, pi.precio_unitario, pi.subtotal
         FROM pedido_items pi
         INNER JOIN productos p ON p.id = pi.producto_id
         WHERE pi.pedido_id = ?`
      )
      .all(pedidoId) as Array<{
        producto_id: number;
        nombre: string;
        imagen_url: string;
        cantidad: number;
        precio_unitario: number;
        subtotal: number;
      }>;

    return rows.map((r) => ({
      productoId: r.producto_id,
      nombre: r.nombre,
      imagen: r.imagen_url,
      cantidad: r.cantidad,
      precioUnitario: r.precio_unitario,
      subtotal: r.subtotal
    }));
  }
}
