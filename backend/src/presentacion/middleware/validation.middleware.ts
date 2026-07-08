import { Request, Response, NextFunction } from 'express';

export type TipoValidacion = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'email';

export interface IReglaCampo {
  campo: string;
  requerido?: boolean;
  tipo?: TipoValidacion;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  patron?: RegExp;
  mensaje?: string;
}

const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export const ESTADOS_PEDIDO = [
  'pendiente',
  'procesando',
  'enviado',
  'entregado',
  'cancelado'
] as const;

export type EstadoPedidoAdmin = (typeof ESTADOS_PEDIDO)[number];

export function validarCampos(reglas: IReglaCampo[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body || {};
    const errores: string[] = [];

    for (const regla of reglas) {
      const valor = body[regla.campo];

      if (valor === undefined || valor === null || valor === '') {
        if (regla.requerido) {
          errores.push(regla.mensaje || `${regla.campo} es requerido`);
        }
        continue;
      }

      if (regla.tipo) {
        const ok = cumpleTipo(valor, regla.tipo);
        if (!ok) {
          errores.push(
            regla.mensaje || `${regla.campo} debe ser de tipo ${regla.tipo}`
          );
          continue;
        }
      }

      if (typeof valor === 'string') {
        if (regla.minLength !== undefined && valor.length < regla.minLength) {
          errores.push(
            regla.mensaje ||
              `${regla.campo} debe tener al menos ${regla.minLength} caracteres`
          );
        }
        if (regla.maxLength !== undefined && valor.length > regla.maxLength) {
          errores.push(
            regla.mensaje ||
              `${regla.campo} debe tener maximo ${regla.maxLength} caracteres`
          );
        }
        if (regla.tipo === 'email' && !EMAIL_REGEX.test(valor)) {
          errores.push(regla.mensaje || `${regla.campo} no es un email valido`);
        }
        if (regla.patron && !regla.patron.test(valor)) {
          errores.push(regla.mensaje || `${regla.campo} tiene formato invalido`);
        }
      }

      if (typeof valor === 'number') {
        if (regla.min !== undefined && valor < regla.min) {
          errores.push(
            regla.mensaje || `${regla.campo} debe ser mayor o igual a ${regla.min}`
          );
        }
        if (regla.max !== undefined && valor > regla.max) {
          errores.push(
            regla.mensaje || `${regla.campo} debe ser menor o igual a ${regla.max}`
          );
        }
      }
    }

    if (errores.length > 0) {
      res.status(400).json({ success: false, errores });
      return;
    }
    next();
  };
}

export function validarPassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'password debe ser texto';
  if (password.length < 6) return 'password debe tener minimo 6 caracteres';
  if (!PASSWORD_REGEX.test(password)) {
    return 'password debe tener al menos una letra y un numero';
  }
  return null;
}

function cumpleTipo(valor: any, tipo: TipoValidacion): boolean {
  switch (tipo) {
    case 'string':
      return typeof valor === 'string';
    case 'number':
      return typeof valor === 'number' && Number.isFinite(valor);
    case 'integer':
      return typeof valor === 'number' && Number.isInteger(valor);
    case 'boolean':
      return typeof valor === 'boolean';
    case 'array':
      return Array.isArray(valor);
    case 'object':
      return typeof valor === 'object' && !Array.isArray(valor);
    case 'email':
      return typeof valor === 'string' && EMAIL_REGEX.test(valor);
    default:
      return true;
  }
}

export const PATRONES = {
  username: USERNAME_REGEX,
  email: EMAIL_REGEX,
  password: PASSWORD_REGEX
};
