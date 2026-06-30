import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Usuario, IUsuarioPublico } from '../dominio/Usuario';
import { UsuarioRepository } from '../infraestructura/UsuarioRepository';
import { SesionRepository } from '../infraestructura/SesionRepository';

const JWT_SECRET = process.env.JWT_SECRET || 'techstore-dev-secret-change-in-prod';
const JWT_EXPIRES_IN = '7d';
const SESSION_DAYS = 7;
const BCRYPT_ROUNDS = 10;

export interface IRegistroInput {
  username: string;
  email: string;
  password: string;
  nombreCompleto: string;
}

export interface ILoginInput {
  username: string;
  password: string;
}

export interface IAuthResultado {
  token: string;
  usuario: IUsuarioPublico;
}

export class AuthService {
  private usuarioRepo: UsuarioRepository;
  private sesionRepo: SesionRepository;

  constructor(usuarioRepo: UsuarioRepository, sesionRepo: SesionRepository) {
    this.usuarioRepo = usuarioRepo;
    this.sesionRepo = sesionRepo;
  }

  public async registrar(input: IRegistroInput): Promise<IAuthResultado> {
    const { username, email, password, nombreCompleto } = input;

    if (this.usuarioRepo.buscarPorUsername(username)) {
      throw new AuthError('El username ya esta en uso', 409);
    }
    if (this.usuarioRepo.buscarPorEmail(email)) {
      throw new AuthError('El email ya esta registrado', 409);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const usuario = this.usuarioRepo.crear(username, email, passwordHash, nombreCompleto);

    const { token, expiresAt } = this.generarTokenYOExpiracion(usuario);
    this.sesionRepo.crear(token, usuario.id, expiresAt);

    return { token, usuario: this.aPublico(usuario) };
  }

  public async login(input: ILoginInput): Promise<IAuthResultado> {
    const { username, password } = input;

    const usuario = this.usuarioRepo.buscarPorUsername(username);
    if (!usuario) {
      throw new AuthError('Credenciales invalidas', 401);
    }

    const coincide = await bcrypt.compare(password, usuario.passwordHash);
    if (!coincide) {
      throw new AuthError('Credenciales invalidas', 401);
    }

    const { token, expiresAt } = this.generarTokenYOExpiracion(usuario);
    this.sesionRepo.crear(token, usuario.id, expiresAt);

    return { token, usuario: this.aPublico(usuario) };
  }

  public logout(token: string): void {
    this.sesionRepo.eliminar(token);
  }

  public obtenerSesion(token: string) {
    return this.sesionRepo.buscar(token);
  }

  private generarTokenYOExpiracion(usuario: Usuario): { token: string; expiresAt: string } {
    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign(
      { usuarioId: usuario.id, username: usuario.username, jti },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const expira = new Date();
    expira.setDate(expira.getDate() + SESSION_DAYS);
    const expiresAt = expira.toISOString();

    return { token, expiresAt };
  }

  private aPublico(usuario: Usuario): IUsuarioPublico {
    return {
      id: usuario.id,
      username: usuario.username,
      email: usuario.email,
      nombreCompleto: usuario.nombreCompleto
    };
  }
}

export class AuthError extends Error {
  public status: number;
  constructor(mensaje: string, status: number = 400) {
    super(mensaje);
    this.status = status;
    this.name = 'AuthError';
  }
}
