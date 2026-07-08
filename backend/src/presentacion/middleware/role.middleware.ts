import { Request, Response, NextFunction } from 'express';
import { RolUsuario } from '../../dominio/Usuario';

export function requerirRol(...rolesPermitidos: Array<RolUsuario>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos suficientes para realizar esta accion'
      });
      return;
    }
    next();
  };
}

export const requerirAdmin = requerirRol('admin');
