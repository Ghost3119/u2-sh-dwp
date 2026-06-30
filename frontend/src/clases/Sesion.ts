export interface IUsuario {
  id: number;
  username: string;
  email: string;
  nombreCompleto?: string;
  role?: string;
}

export interface ISesionPersistente {
  token: string;
  usuario: IUsuario;
  expiracion: number;
}

const CLAVE_STORAGE = 'saber-hacer-u2-sesion';

export class Sesion {
  private _token: string | null = null;
  private _usuario: IUsuario | null = null;
  private _expiracion: number = 0;

  constructor() {
    this.restaurar();
  }

  public get token(): string | null { return this._token; }
  public get usuario(): IUsuario | null { return this._usuario; }
  public get expiracion(): number { return this._expiracion; }

  public iniciar(token: string, usuario: IUsuario, expiracion: number = Date.now() + 3600 * 1000): void {
    this._token = token;
    this._usuario = usuario;
    this._expiracion = expiracion;
    this.persistir();
  }

  public cerrar(): void {
    this._token = null;
    this._usuario = null;
    this._expiracion = 0;
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

  public obtenerToken(): string | null {
    return this._token;
  }

  public obtenerUsuario(): IUsuario | null {
    return this._usuario;
  }

  private persistir(): void {
    const datos: ISesionPersistente = {
      token: this._token as string,
      usuario: this._usuario as IUsuario,
      expiracion: this._expiracion
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
    } catch (error) {
      console.error('Error al restaurar sesion:', error);
      localStorage.removeItem(CLAVE_STORAGE);
    }
  }
}
