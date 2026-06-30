import { Router, Request, Response } from 'express';
import { PedidoService, PedidoError } from '../aplicacion/PedidoService';
import { SesionRepository } from '../infraestructura/SesionRepository';
import { requerirAuth } from './middleware/auth.middleware';

export function crearPedidosRouter(
  pedidoService: PedidoService,
  sesionRepo: SesionRepository
): Router {
  const router = Router();

  router.use(requerirAuth(sesionRepo));

  router.post('/', async (req: Request, res: Response) => {
    try {
      const { items, direccionEnvio } = req.body || {};
      const errores: string[] = [];

      if (!Array.isArray(items) || items.length === 0) {
        errores.push('items debe ser un arreglo con al menos un elemento');
      } else {
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (!it || typeof it !== 'object') {
            errores.push(`items[${i}] invalido`);
            continue;
          }
          if (!Number.isInteger(it.productoId) || it.productoId <= 0) {
            errores.push(`items[${i}].productoId debe ser entero positivo`);
          }
          if (!Number.isInteger(it.cantidad) || it.cantidad <= 0) {
            errores.push(`items[${i}].cantidad debe ser entero positivo`);
          }
        }
      }

      if (typeof direccionEnvio !== 'string' || direccionEnvio.trim().length < 10) {
        errores.push('direccionEnvio debe tener al menos 10 caracteres');
      }

      if (errores.length > 0) {
        res.status(400).json({ success: false, errores });
        return;
      }

      const usuarioId = req.usuario!.id;
      const pedido = await pedidoService.crearPedido({
        usuarioId,
        items,
        direccionEnvio: direccionEnvio.trim()
      });
      res.status(201).json({ success: true, data: pedido });
    } catch (err) {
      if (err instanceof PedidoError) {
        res.status(err.status).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: 'Error al crear el pedido' });
    }
  });

  router.get('/', (req: Request, res: Response) => {
    try {
      const usuarioId = req.usuario!.id;
      const pedidos = pedidoService.listarPedidosUsuario(usuarioId);
      res.json({ success: true, data: pedidos, total: pedidos.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al obtener pedidos' });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ success: false, error: 'ID invalido' });
        return;
      }
      const usuarioId = req.usuario!.id;
      const pedido = pedidoService.obtenerPedido(id, usuarioId);
      res.json({ success: true, data: pedido });
    } catch (err) {
      if (err instanceof PedidoError) {
        res.status(err.status).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: 'Error al obtener el pedido' });
    }
  });

  return router;
}
