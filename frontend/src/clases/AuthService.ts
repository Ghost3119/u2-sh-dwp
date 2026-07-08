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
  rol?: 'admin' | 'cliente' | string;
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
      this.guardarSesion(respuesta);
      return respuesta.usuario;
    } catch (error) {
      console.error('Error en registrar:', error);
      throw error;
    }
  }

  public async login(username: string, password: string): Promise<IUsuario> {
    try {
      const respuesta = await api.login({ username, password });
      this.guardarSesion(respuesta);
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
        const token = this._sesion.obtenerToken() as string;
        const rol = (perfil as IUsuario).rol ?? (perfil as IUsuario).role;
        this._sesion.iniciar(token, perfil, this._sesion.expiracion);
        if (rol) this._sesion.actualizarRol(rol);
      }
      return perfil;
    } catch (error) {
      console.warn('No se pudo obtener perfil, limpiando sesion');
      this._sesion.cerrar();
      return null;
    }
  }

  private guardarSesion(respuesta: ILoginRespuesta): void {
    if (respuesta.token && respuesta.usuario) {
      const rol = respuesta.rol ?? respuesta.usuario.rol ?? respuesta.usuario.role;
      this._sesion.iniciar(respuesta.token, respuesta.usuario, respuesta.expiracion);
      if (rol) this._sesion.actualizarRol(rol);
    }
  }
}
