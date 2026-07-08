import { Router, Request, Response } from 'express';
import { SesionRepository } from '../infraestructura/SesionRepository';
import { AuthService } from '../aplicacion/AuthService';
import { requerirAuth } from './middleware/auth.middleware';

export function crearSesionesRouter(
  sesionRepo: SesionRepository,
  _authService: AuthService
): Router {
  const router = Router();
  router.use(requerirAuth(sesionRepo));

  router.get('/', (req: Request, res: Response) => {
    try {
      const usuarioId = req.usuario!.id;
      const tokenActual = req.token!;
      const sesiones = sesionRepo.obtenerPorUsuario(usuarioId);
      const data = sesiones.map((s) => ({
        id: s.id,
        dispositivo: s.dispositivo,
        ip: s.ip,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        esActual: s.token === tokenActual
      }));
      res.json({ success: true, data, total: data.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al obtener sesiones' });
    }
  });

  router.delete('/otras', (req: Request, res: Response) => {
    try {
      const usuarioId = req.usuario!.id;
      const tokenActual = req.token!;
      const cerradas = sesionRepo.cerrarOtras(usuarioId, tokenActual);
      res.json({
        success: true,
        mensaje: `Se cerraron ${cerradas} sesion(es) adicionales`,
        sesionesCerradas: cerradas
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al cerrar otras sesiones' });
    }
  });

  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ success: false, error: 'ID invalido' });
        return;
      }
      const usuarioId = req.usuario!.id;
      const tokenActual = req.token!;

      const sesiones = sesionRepo.obtenerPorUsuario(usuarioId);
      const objetivo = sesiones.find((s) => s.id === id);
      if (!objetivo) {
        res.status(404).json({ success: false, error: 'Sesion no encontrada' });
        return;
      }
      if (objetivo.token === tokenActual) {
        res.status(400).json({ success: false, error: 'No puedes cerrar tu sesion actual desde aqui, usa /api/auth/logout' });
        return;
      }

      const ok = sesionRepo.cerrar(id, usuarioId);
      if (!ok) {
        res.status(404).json({ success: false, error: 'Sesion no encontrada' });
        return;
      }
      res.json({ success: true, mensaje: 'Sesion cerrada exitosamente' });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al cerrar la sesion' });
    }
  });

  return router;
}
