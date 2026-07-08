import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { SesionRepository } from '../../infraestructura/SesionRepository';
import { RolUsuario } from '../../dominio/Usuario';

const JWT_SECRET = process.env.JWT_SECRET || 'techstore-dev-secret-change-in-prod';

export interface IUsuarioSesion {
  id: number;
  username: string;
  email: string;
  nombreCompleto: string;
  rol: RolUsuario;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: IUsuarioSesion;
      token?: string;
    }
  }
}

export function requerirAuth(sesionRepo: SesionRepository) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res
        .status(401)
        .json({ success: false, error: 'Token no proporcionado' });
      return;
    }

    const token = header.substring('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ success: false, error: 'Token vacio' });
      return;
    }

    let payload: { usuarioId: number; username: string; rol?: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { usuarioId: number; username: string; rol?: string };
    } catch (err: any) {
      const msg =
        err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token invalido';
      res.status(401).json({ success: false, error: msg });
      return;
    }

    const sesion = sesionRepo.buscar(token);
    if (!sesion) {
      res.status(401).json({ success: false, error: 'Sesion no encontrada' });
      return;
    }

    if (new Date(sesion.expiresAt) < new Date()) {
      sesionRepo.eliminar(token);
      res.status(401).json({ success: false, error: 'Sesion expirada' });
      return;
    }

    if (sesion.usuarioId !== payload.usuarioId) {
      res.status(401).json({ success: false, error: 'Token inconsistente' });
      return;
    }

    const rol: RolUsuario = sesion.rol === 'admin' ? 'admin' : 'cliente';

    req.usuario = {
      id: sesion.usuarioId,
      username: sesion.username,
      email: sesion.email,
      nombreCompleto: sesion.nombreCompleto,
      rol
    };
    req.token = token;
    next();
  };
}
