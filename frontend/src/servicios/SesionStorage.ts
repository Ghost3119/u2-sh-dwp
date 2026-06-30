export interface IEntradaSesion<T> {
  valor: T;
  timestamp: number;
}

export class SesionStorage {
  private _prefijo: string;

  constructor(prefijo: string = 'saber-hacer-u2') {
    this._prefijo = prefijo;
  }

  public guardar<T>(clave: string, valor: T): void {
    try {
      const entrada: IEntradaSesion<T> = { valor, timestamp: Date.now() };
      localStorage.setItem(this.claveCompleta(clave), JSON.stringify(entrada));
    } catch (error) {
      console.error(`Error al guardar ${clave}:`, error);
    }
  }

  public obtener<T>(clave: string): T | null {
    try {
      const raw = localStorage.getItem(this.claveCompleta(clave));
      if (!raw) return null;
      const entrada: IEntradaSesion<T> = JSON.parse(raw);
      return entrada.valor;
    } catch (error) {
      console.error(`Error al obtener ${clave}:`, error);
      return null;
    }
  }

  public eliminar(clave: string): void {
    localStorage.removeItem(this.claveCompleta(clave));
  }

  public limpiarTodo(): void {
    const claves: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this._prefijo)) claves.push(k);
    }
    claves.forEach(k => localStorage.removeItem(k));
  }

  public existe(clave: string): boolean {
    return localStorage.getItem(this.claveCompleta(clave)) !== null;
  }

  private claveCompleta(clave: string): string {
    return `${this._prefijo}:${clave}`;
  }
}

export const sesionStorage = new SesionStorage();
