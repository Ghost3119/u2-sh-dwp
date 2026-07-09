import { Router, Request, Response } from 'express';
import { requerirAuth } from './middleware/auth.middleware';
import { requerirAdmin } from './middleware/role.middleware';
import { UsuarioRepository } from '../infraestructura/UsuarioRepository';
import { SesionRepository } from '../infraestructura/SesionRepository';
import { PedidoRepository } from '../infraestructura/PedidoRepository';
import { ProductoRepository } from '../infraestructura/ProductoRepository';
import { validarCampos, ESTADOS_PEDIDO } from './middleware/validation.middleware';
import {
  usuarioRepo as defaultUsuarioRepo,
  sesionRepo as defaultSesionRepo,
  pedidoRepo as defaultPedidoRepo,
  productoRepo as defaultProductoRepo
} from '../aplicacion/dependencias';

export function crearAdminRouter(
  usuarioRepo: UsuarioRepository = defaultUsuarioRepo,
  sesionRepo: SesionRepository = defaultSesionRepo,
  pedidoRepo: PedidoRepository = defaultPedidoRepo,
  productoRepo: ProductoRepository = defaultProductoRepo
): Router {
  const router = Router();

  router.use(requerirAuth(sesionRepo));
  router.use(requerirAdmin);

  router.get('/usuarios', (_req: Request, res: Response) => {
    try {
      const usuarios = usuarioRepo.listarTodos();
      const data = usuarios.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        nombreCompleto: u.nombreCompleto,
        rol: u.rol,
        createdAt: u.createdAt
      }));
      res.json({ success: true, data, total: data.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al listar usuarios' });
    }
  });

  router.get('/usuarios/:id/sesiones', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ success: false, error: 'ID invalido' });
        return;
      }
      const usuario = usuarioRepo.buscarPorId(id);
      if (!usuario) {
        res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        return;
      }
      const sesiones = sesionRepo.obtenerPorUsuario(id);
      res.json({ success: true, data: sesiones, total: sesiones.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al obtener sesiones' });
    }
  });

  router.delete('/usuarios/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ success: false, error: 'ID invalido' });
        return;
      }
      if (id === req.usuario!.id) {
        res.status(400).json({ success: false, error: 'No puedes eliminarte a ti mismo' });
        return;
      }
      const usuario = usuarioRepo.buscarPorId(id);
      if (!usuario) {
        res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        return;
      }
      usuarioRepo.eliminar(id);
      res.json({ success: true, mensaje: `Usuario ${usuario.username} eliminado` });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        res.status(409).json({ success: false, error: 'No se puede eliminar el usuario porque tiene pedidos o datos relacionados' });
        return;
      }
      res.status(500).json({ success: false, error: 'Error al eliminar el usuario' });
    }
  });

  router.get('/pedidos', (_req: Request, res: Response) => {
    try {
      const pedidos = pedidoRepo.obtenerTodos();
      res.json({ success: true, data: pedidos, total: pedidos.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al listar pedidos' });
    }
  });

  router.patch('/pedidos/:id/estado', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ success: false, error: 'ID invalido' });
        return;
      }
      const { estado } = req.body || {};
      if (typeof estado !== 'string' || !ESTADOS_PEDIDO.includes(estado as any)) {
        res.status(400).json({
          success: false,
          error: `estado invalido. Valores permitidos: ${ESTADOS_PEDIDO.join(', ')}`
        });
        return;
      }
      const ok = pedidoRepo.actualizarEstado(id, estado);
      if (!ok) {
        res.status(404).json({ success: false, error: 'Pedido no encontrado' });
        return;
      }
      res.json({ success: true, mensaje: `Pedido ${id} actualizado a estado "${estado}"` });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al actualizar el pedido' });
    }
  });

  router.get('/estadisticas', async (_req: Request, res: Response) => {
    try {
      const usuarios = usuarioRepo.listarTodos();
      const totalUsuarios = usuarios.length;
      const totalPedidos = pedidoRepo.contarTodos();
      const totalIngresos = pedidoRepo.totalIngresos();
      const pedidosPorEstado = pedidoRepo.contarPorEstado();
      const topProductos = pedidoRepo.topProductosVendidos(5);
      const totalProductos = await productoRepo.contarTodos();
      res.json({
        success: true,
        data: {
          totalUsuarios,
          totalProductos,
          totalPedidos,
          ingresosTotales: totalIngresos,
          pedidosPorEstado,
          topProductos
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al obtener estadisticas' });
    }
  });

  router.post(
    '/productos',
    validarCampos([
      { campo: 'nombre', requerido: true, tipo: 'string', minLength: 2, maxLength: 100, mensaje: 'nombre es requerido (2-100 caracteres)' },
      { campo: 'descripcion', requerido: true, tipo: 'string', minLength: 5, mensaje: 'descripcion debe tener al menos 5 caracteres' },
      { campo: 'precio', requerido: true, tipo: 'number', min: 0, mensaje: 'precio debe ser numero mayor o igual a 0' },
      { campo: 'categoria', requerido: true, tipo: 'string', minLength: 2, mensaje: 'categoria es requerida' },
      { campo: 'imagen', requerido: true, tipo: 'string', mensaje: 'imagen (URL) es requerida' },
      { campo: 'stock', requerido: true, tipo: 'integer', min: 0, mensaje: 'stock debe ser entero mayor o igual a 0' }
    ]),
    async (req: Request, res: Response) => {
      try {
        const { nombre, descripcion, precio, categoria, imagen, stock, rating } = req.body;
        const producto = await productoRepo.crear({
          nombre,
          descripcion,
          precio,
          categoria,
          imagen,
          stock,
          rating
        });
        res.status(201).json({ success: true, data: producto });
      } catch (err) {
        res.status(500).json({ success: false, error: 'Error al crear el producto' });
      }
    }
  );

  router.put(
    '/productos/:id',
    validarCampos([
      { campo: 'nombre', tipo: 'string', minLength: 2, maxLength: 100 },
      { campo: 'descripcion', tipo: 'string', minLength: 5 },
      { campo: 'precio', tipo: 'number', min: 0 },
      { campo: 'categoria', tipo: 'string', minLength: 2 },
      { campo: 'imagen', tipo: 'string' },
      { campo: 'stock', tipo: 'integer', min: 0 }
    ]),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) {
          res.status(400).json({ success: false, error: 'ID invalido' });
          return;
        }
        const producto = await productoRepo.actualizar(id, req.body);
        if (!producto) {
          res.status(404).json({ success: false, error: 'Producto no encontrado' });
          return;
        }
        res.json({ success: true, data: producto });
      } catch (err) {
        res.status(500).json({ success: false, error: 'Error al actualizar el producto' });
      }
    }
  );

  router.delete('/productos/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ success: false, error: 'ID invalido' });
        return;
      }
      try {
        const ok = await productoRepo.eliminar(id);
        if (!ok) {
          res.status(404).json({ success: false, error: 'Producto no encontrado' });
          return;
        }
        res.json({ success: true, mensaje: `Producto ${id} eliminado` });
      } catch (err: any) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          res.status(409).json({ success: false, error: 'No se puede eliminar el producto porque tiene pedidos relacionados' });
          return;
        }
        throw err;
      }
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al eliminar el producto' });
    }
  });

  return router;
}
