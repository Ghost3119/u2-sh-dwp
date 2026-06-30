import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { db } from './infraestructura/database';
import routes from './presentacion/routes';
import { crearAuthRouter } from './presentacion/auth.routes';
import { crearPedidosRouter } from './presentacion/pedidos.routes';
import { authService, pedidoService, sesionRepo } from './aplicacion/dependencias';

const app = express();
const PORT = 4000;

db.getConn().exec(`DELETE FROM sesiones WHERE expires_at < datetime('now')`);

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiadas solicitudes, intenta de nuevo en 15 minutos'
  }
});
app.use('/api', limiter);

app.use((req: Request, res: Response, next: NextFunction) => {
  const inicio = Date.now();
  res.on('finish', () => {
    const duracion = Date.now() - inicio;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duracion}ms`
    );
  });
  next();
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    mensaje: 'API Portal de Catalogo - DWP Unidad 2',
    endpoints: [
      'GET    /',
      'POST   /api/auth/registro',
      'POST   /api/auth/login',
      'POST   /api/auth/logout',
      'GET    /api/auth/me',
      'GET    /api/productos',
      'GET    /api/productos/:id',
      'GET    /api/buscar?q=termino',
      'GET    /api/categorias',
      'POST   /api/carrito',
      'GET    /api/carrito/:id',
      'POST   /api/pedidos',
      'GET    /api/pedidos',
      'GET    /api/pedidos/:id'
    ]
  });
});

app.use('/api/auth', crearAuthRouter(authService, sesionRepo));
app.use('/api/pedidos', crearPedidosRouter(pedidoService, sesionRepo));
app.use('/api', routes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error no controlado:', err);
  if (err.type === 'entity.too.large') {
    res.status(413).json({ success: false, error: 'Cuerpo de solicitud demasiado grande' });
    return;
  }
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: 'JSON invalido' });
    return;
  }
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
  });
}

export { app };
