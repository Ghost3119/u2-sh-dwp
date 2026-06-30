import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import BetterSqlite from 'better-sqlite3';
import { crearBDTest, limpiarTablas, seedProducto, seedUsuarioDemo } from './dbTest';
import { ProductoRepository } from '../../infraestructura/ProductoRepository';
import { UsuarioRepository } from '../../infraestructura/UsuarioRepository';
import { SesionRepository } from '../../infraestructura/SesionRepository';
import { PedidoRepository } from '../../infraestructura/PedidoRepository';
import { AuthService } from '../../aplicacion/AuthService';
import { PedidoService } from '../../aplicacion/PedidoService';
import { ProductoService, CarritoService } from '../../aplicacion/ProductoService';
import { crearAuthRouter } from '../../presentacion/auth.routes';
import { crearPedidosRouter } from '../../presentacion/pedidos.routes';
import { routes as crearProductosRouter } from '../../presentacion/routes';

type SqliteDatabase = BetterSqlite.Database;

export interface ITestApp {
  app: express.Express;
  conn: SqliteDatabase;
  reiniciar: () => void;
}

export function construirAppTest(): ITestApp {
  const conn = crearBDTest();
  const productoRepo = new ProductoRepository(conn);
  const usuarioRepo = new UsuarioRepository(conn);
  const sesionRepo = new SesionRepository(conn);
  const pedidoRepo = new PedidoRepository(conn);
  const authService = new AuthService(usuarioRepo, sesionRepo);
  const pedidoService = new PedidoService(pedidoRepo, productoRepo);
  const productoService = new ProductoService(productoRepo);
  const carritoService = new CarritoService(productoRepo);

  const seed = () => {
    limpiarTablas(conn);
    seedUsuarioDemo(conn, 'demo');
    seedProducto(conn, { nombre: 'Laptop Gamer', precio: 25000, categoria: 'Electronica', stock: 10, rating: 4.7 });
    seedProducto(conn, { nombre: 'Mouse Optico', precio: 800, categoria: 'Accesorios', stock: 50, rating: 4.2 });
    seedProducto(conn, { nombre: 'Silla Ergonomica', precio: 5500, categoria: 'Muebles', stock: 5, rating: 4.5 });
  };
  seed();

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', crearAuthRouter(authService, sesionRepo));
  app.use('/api/pedidos', crearPedidosRouter(pedidoService, sesionRepo));
  app.use('/api', crearProductosRouter(productoService, carritoService));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Ruta no encontrada' });
  });
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ success: false, error: err.message });
  });

  return { app, conn, reiniciar: seed };
}
