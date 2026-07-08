import request from 'supertest';
import type { Express } from 'express';

export interface ICredencialesPorRol {
  username: string;
  password: string;
}

const CREDENCIALES: Record<'admin' | 'cliente', ICredencialesPorRol> = {
  admin: { username: 'admin', password: 'admin123' },
  cliente: { username: 'demo', password: 'demo123' }
};

export interface ILoginResultado {
  token: string;
  usuarioId: number;
  username: string;
  rol: 'admin' | 'cliente';
}

export async function loginComo(
  app: Express,
  rol: 'admin' | 'cliente',
  credenciales?: ICredencialesPorRol
): Promise<ILoginResultado> {
  const creds = credenciales ?? CREDENCIALES[rol];
  const res = await request(app).post('/api/auth/login').send(creds);
  if (res.status !== 200) {
    throw new Error(
      `loginComo(${rol}) fallo: status=${res.status} body=${JSON.stringify(res.body)}`
    );
  }
  return {
    token: res.body.data.token,
    usuarioId: res.body.data.usuario.id,
    username: res.body.data.usuario.username,
    rol: res.body.data.usuario.rol
  };
}

export async function registrarYObtenerToken(
  app: Express,
  username: string,
  password: string = 'pass1234',
  email?: string
): Promise<{ token: string; usuarioId: number }> {
  const res = await request(app)
    .post('/api/auth/registro')
    .send({
      username,
      email: email ?? `${username}@utc.mx`,
      password,
      nombreCompleto: username
    });
  if (res.status !== 201) {
    throw new Error(
      `registrarYObtenerToken(${username}) fallo: status=${res.status} body=${JSON.stringify(
        res.body
      )}`
    );
  }
  return { token: res.body.data.token, usuarioId: res.body.data.usuario.id };
}
