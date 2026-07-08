import { Router, Request, Response } from 'express';
import { PasswordResetService, PasswordResetError } from '../aplicacion/PasswordResetService';
import { validarCampos, validarPassword } from './middleware/validation.middleware';

export function crearPasswordRouter(passwordResetService: PasswordResetService): Router {
  const router = Router();

  router.post(
    '/recuperar',
    validarCampos([
      { campo: 'email', requerido: true, tipo: 'email', mensaje: 'email invalido' }
    ]),
    async (req: Request, res: Response) => {
      try {
        const { email } = req.body;
        const esDesarrollo = process.env.NODE_ENV !== 'production';
        const resultado = await passwordResetService.solicitarRecuperacion(email);

        const respuesta: { success: true; mensaje: string; token?: string } = {
          success: true,
          mensaje: resultado.mensajeExito
        };
        if (esDesarrollo && resultado.tokenCrudo) {
          respuesta.token = resultado.tokenCrudo;
        }
        res.json(respuesta);
      } catch (err) {
        res.status(500).json({ success: false, error: 'Error al solicitar recuperacion' });
      }
    }
  );

  const validarNuevoPassword = (
    req: Request,
    res: Response,
    next: import('express').NextFunction
  ): void => {
    const err = validarPassword(req.body?.nuevoPassword);
    if (err) {
      res.status(400).json({ success: false, errores: [err] });
      return;
    }
    next();
  };

  router.post(
    '/resetear',
    validarCampos([
      { campo: 'token', requerido: true, tipo: 'string', minLength: 10, mensaje: 'token es requerido' }
    ]),
    validarNuevoPassword,
    async (req: Request, res: Response) => {
      try {
        const { token, nuevoPassword } = req.body;
        const resultado = await passwordResetService.resetearPassword(token, nuevoPassword);
        res.json({ success: true, mensaje: resultado.mensajeExito });
      } catch (err) {
        if (err instanceof PasswordResetError) {
          res.status(err.status).json({ success: false, error: err.message });
          return;
        }
        res.status(500).json({ success: false, error: 'Error al resetear contrasena' });
      }
    }
  );

  return router;
}
