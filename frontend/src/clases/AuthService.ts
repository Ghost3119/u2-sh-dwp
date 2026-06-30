import { Sesion, IUsuario } from './Sesion';
import { api } from '../servicios/ApiService';

export interface IRegistroDatos {
  username: string;
  email: string;
  password: string;
  nombreCompleto: string;
}

export interface ILoginDatos {
  username: string;
  password: string;
}

export interface ILoginRespuesta {
  token: string;
  usuario: IUsuario;
  expiracion?: number;
}

export class AuthService {
  private _sesion: Sesion;

  constructor(sesion: Sesion) {
    this._sesion = sesion;
  }

  public get sesion(): Sesion { return this._sesion; }

  public async registrar(datos: IRegistroDatos): Promise<IUsuario> {
    try {
      const respuesta = await api.registro(datos);
      if (respuesta.token && respuesta.usuario) {
        this._sesion.iniciar(respuesta.token, respuesta.usuario, respuesta.expiracion);
      }
      return respuesta.usuario;
    } catch (error) {
      console.error('Error en registrar:', error);
      throw error;
    }
  }

  public async login(username: string, password: string): Promise<IUsuario> {
    try {
      const respuesta = await api.login({ username, password });
      this._sesion.iniciar(respuesta.token, respuesta.usuario, respuesta.expiracion);
      return respuesta.usuario;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  public async logout(): Promise<void> {
    try {
      await api.logout();
    } catch (error) {
      console.warn('Logout remoto fallo, limpiando sesion local');
    } finally {
      this._sesion.cerrar();
    }
  }

  public async obtenerPerfil(): Promise<IUsuario | null> {
    if (!this._sesion.estaAutenticada()) return null;
    try {
      const perfil = await api.obtenerPerfil();
      if (perfil) {
        this._sesion.iniciar(this._sesion.obtenerToken() as string, perfil, this._sesion.expiracion);
      }
      return perfil;
    } catch (error) {
      console.warn('No se pudo obtener perfil, limpiando sesion');
      this._sesion.cerrar();
      return null;
    }
  }
}
