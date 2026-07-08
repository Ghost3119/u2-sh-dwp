import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsuarioRepository } from '../infraestructura/UsuarioRepository';
import { PasswordResetRepository } from '../infraestructura/PasswordResetRepository';
import { SesionRepository } from '../infraestructura/SesionRepository';

const BCRYPT_ROUNDS = 10;
const MINUTOS_EXPIRACION = 30;
const MIN_PASSWORD_LENGTH = 6;

export class PasswordResetError extends Error {
  public status: number;
  constructor(mensaje: string, status: number = 400) {
    super(mensaje);
    this.status = status;
    this.name = 'PasswordResetError';
  }
}

export interface ISolicitarResultado {
  mensajeExito: string;
  tokenCrudo?: string;
}

export interface IResetearResultado {
  mensajeExito: string;
}

export class PasswordResetService {
  private usuarioRepo: UsuarioRepository;
  private passwordResetRepo: PasswordResetRepository;
  private sesionRepo: SesionRepository;

  constructor(
    usuarioRepo: UsuarioRepository,
    passwordResetRepo: PasswordResetRepository,
    sesionRepo: SesionRepository
  ) {
    this.usuarioRepo = usuarioRepo;
    this.passwordResetRepo = passwordResetRepo;
    this.sesionRepo = sesionRepo;
  }

  public async solicitarRecuperacion(email: string): Promise<ISolicitarResultado> {
    const mensajeExito =
      'Si el email existe, recibiras instrucciones para recuperar tu contrasena';

    if (!email || typeof email !== 'string') {
      return { mensajeExito };
    }

    const usuario = this.usuarioRepo.buscarPorEmail(email);
    if (!usuario) {
      return { mensajeExito };
    }

    const tokenCrudo = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenCrudo).digest('hex');

    const expiracion = new Date();
    expiracion.setMinutes(expiracion.getMinutes() + MINUTOS_EXPIRACION);
    const expiresAt = expiracion.toISOString();

    this.passwordResetRepo.crear(usuario.id, tokenHash, expiresAt);

    return { mensajeExito, tokenCrudo };
  }

  public async resetearPassword(token: string, nuevoPassword: string): Promise<IResetearResultado> {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new PasswordResetError('Token invalido', 400);
    }

    if (!nuevoPassword || typeof nuevoPassword !== 'string') {
      throw new PasswordResetError('nuevoPassword es requerido', 400);
    }
    if (nuevoPassword.length < MIN_PASSWORD_LENGTH) {
      throw new PasswordResetError(
        `nuevoPassword debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
        400
      );
    }
    if (!/[A-Za-z]/.test(nuevoPassword) || !/[0-9]/.test(nuevoPassword)) {
      throw new PasswordResetError(
        'nuevoPassword debe contener al menos una letra y un numero',
        400
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const registro = this.passwordResetRepo.buscarPorTokenHash(tokenHash);
    if (!registro) {
      throw new PasswordResetError('Token invalido o expirado', 400);
    }
    if (registro.usado === 1) {
      throw new PasswordResetError('Token ya fue utilizado', 400);
    }
    if (new Date(registro.expiresAt) < new Date()) {
      throw new PasswordResetError('Token expirado', 400);
    }

    const passwordHash = await bcrypt.hash(nuevoPassword, BCRYPT_ROUNDS);
    this.usuarioRepo.actualizarPassword(registro.usuarioId, passwordHash);
    this.passwordResetRepo.marcarUsado(registro.id);
    this.sesionRepo.eliminarPorUsuario(registro.usuarioId);

    return { mensajeExito: 'Contrasena actualizada exitosamente' };
  }
}
