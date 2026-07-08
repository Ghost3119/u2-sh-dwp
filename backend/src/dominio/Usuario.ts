export type RolUsuario = 'admin' | 'cliente';

export interface IUsuario {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  nombreCompleto: string;
  rol: RolUsuario;
  createdAt: string;
}

export interface IUsuarioPublico {
  id: number;
  username: string;
  email: string;
  nombreCompleto: string;
  rol: RolUsuario;
}

export class Usuario implements IUsuario {
  constructor(
    public id: number,
    public username: string,
    public email: string,
    public passwordHash: string,
    public nombreCompleto: string,
    public rol: RolUsuario = 'cliente',
    public createdAt: string = new Date().toISOString()
  ) {}

  public obtenerIniciales(): string {
    return this.nombreCompleto
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  public toDTO(): Omit<IUsuario, 'passwordHash'> {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      nombreCompleto: this.nombreCompleto,
      rol: this.rol,
      createdAt: this.createdAt
    };
  }

  public static desdeFila(fila: {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    nombre_completo: string;
    rol?: string | null;
    created_at: string;
  }): Usuario {
    const rol: RolUsuario = fila.rol === 'admin' ? 'admin' : 'cliente';
    return new Usuario(
      fila.id,
      fila.username,
      fila.email,
      fila.password_hash,
      fila.nombre_completo,
      rol,
      fila.created_at
    );
  }
}
