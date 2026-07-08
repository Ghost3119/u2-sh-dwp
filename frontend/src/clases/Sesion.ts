export type Rol = 'admin' | 'cliente';

export interface IUsuario {
  id: number;
  username: string;
  email: string;
  nombreCompleto?: string;
  role?: string;
  rol?: Rol | string;
}

export interface ISesionPersistente {
  token: string;
  usuario: IUsuario;
  expiracion: number;
  rol: Rol;
}

const CLAVE_STORAGE = 'saber-hacer-u2-sesion';

export class Sesion {
  private _token: string | null = null;
  private _usuario: IUsuario | null = null;
  private _expiracion: number = 0;
  private _rol: Rol = 'cliente';

  constructor() {
    this.restaurar();
  }

  public get token(): string | null { return this._token; }
  public get usuario(): IUsuario | null { return this._usuario; }
  public get expiracion(): number { return this._expiracion; }
  public get rol(): Rol { return this._rol; }

  public iniciar(token: string, usuario: IUsuario, expiracion: number = Date.now() + 3600 * 1000): void {
    this._token = token;
    this._usuario = usuario;
    this._expiracion = expiracion;
    this._rol = this.normalizarRol(usuario.rol ?? usuario.role);
    this.persistir();
  }

  public cerrar(): void {
    this._token = null;
    this._usuario = null;
    this._expiracion = 0;
    this._rol = 'cliente';
    localStorage.removeItem(CLAVE_STORAGE);
  }

  public estaAutenticada(): boolean {
    if (!this._token || !this._usuario) return false;
    if (Date.now() > this._expiracion) {
      this.cerrar();
      return false;
    }
    return true;
  }

  public esAdmin(): boolean {
    return this._rol === 'admin';
  }

  public obtenerToken(): string | null {
    return this._token;
  }

  public obtenerUsuario(): IUsuario | null {
    return this._usuario;
  }

  public obtenerRol(): Rol {
    return this._rol;
  }

  public actualizarRol(rol: Rol | string): void {
    this._rol = this.normalizarRol(rol);
    this.persistir();
  }

  private normalizarRol(rol: Rol | string | undefined | null): Rol {
    if (typeof rol === 'string' && rol.toLowerCase() === 'admin') return 'admin';
    return 'cliente';
  }

  private persistir(): void {
    const datos: ISesionPersistente = {
      token: this._token as string,
      usuario: this._usuario as IUsuario,
      expiracion: this._expiracion,
      rol: this._rol
    };
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(datos));
    } catch (error) {
      console.error('Error al persistir sesion:', error);
    }
  }

  private restaurar(): void {
    try {
      const raw = localStorage.getItem(CLAVE_STORAGE);
      if (!raw) return;
      const datos: ISesionPersistente = JSON.parse(raw);
      if (Date.now() > datos.expiracion) {
        localStorage.removeItem(CLAVE_STORAGE);
        return;
      }
      this._token = datos.token;
      this._usuario = datos.usuario;
      this._expiracion = datos.expiracion;
      this._rol = this.normalizarRol(datos.rol ?? datos.usuario?.rol ?? datos.usuario?.role);
    } catch (error) {
      console.error('Error al restaurar sesion:', error);
      localStorage.removeItem(CLAVE_STORAGE);
    }
  }
}
