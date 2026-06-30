import { Router, Request, Response } from 'express';
import { AuthService, AuthError } from '../aplicacion/AuthService';
import { validarCampos, PATRONES } from './middleware/validation.middleware';
import { requerirAuth } from './middleware/auth.middleware';
import { SesionRepository } from '../infraestructura/SesionRepository';

export function crearAuthRouter(
  authService: AuthService,
  sesionRepo: SesionRepository
): Router {
  const router = Router();

  router.post(
    '/registro',
    validarCampos([
      { campo: 'username', requerido: true, tipo: 'string', minLength: 3, maxLength: 20, patron: PATRONES.username, mensaje: 'username debe tener 3-20 caracteres alfanumericos' },
      { campo: 'email', requerido: true, tipo: 'email', mensaje: 'email invalido' },
      { campo: 'password', requerido: true, tipo: 'string', minLength: 6, mensaje: 'password debe tener minimo 6 caracteres' },
      { campo: 'nombreCompleto', requerido: true, tipo: 'string', minLength: 1, maxLength: 100, mensaje: 'nombreCompleto es requerido' }
    ]),
    async (req: Request, res: Response) => {
      try {
        const resultado = await authService.registrar(req.body);
        res.status(201).json({ success: true, data: resultado });
      } catch (err) {
        if (err instanceof AuthError) {
          res.status(err.status).json({ success: false, error: err.message });
          return;
        }
        res.status(500).json({ success: false, error: 'Error al registrar usuario' });
      }
    }
  );

  router.post(
    '/login',
    validarCampos([
      { campo: 'username', requerido: true, tipo: 'string' },
      { campo: 'password', requerido: true, tipo: 'string' }
    ]),
    async (req: Request, res: Response) => {
      try {
        const resultado = await authService.login(req.body);
        res.json({ success: true, data: resultado });
      } catch (err) {
        if (err instanceof AuthError) {
          res.status(err.status).json({ success: false, error: err.message });
          return;
        }
        res.status(500).json({ success: false, error: 'Error al iniciar sesion' });
      }
    }
  );

  router.post(
    '/logout',
    requerirAuth(sesionRepo),
    (req: Request, res: Response) => {
      try {
        if (req.token) {
          authService.logout(req.token);
        }
        res.json({ success: true, mensaje: 'Sesion cerrada' });
      } catch (err) {
        res.status(500).json({ success: false, error: 'Error al cerrar sesion' });
      }
    }
  );

  router.get(
    '/me',
    requerirAuth(sesionRepo),
    (req: Request, res: Response) => {
      res.json({ success: true, data: req.usuario });
    }
  );

  return router;
}
