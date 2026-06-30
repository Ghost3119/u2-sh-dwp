import express from 'express';
import cors from 'cors';
import routes from './presentacion/routes';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    mensaje: 'API Portal de Catalogo - DWP Unidad 2',
    endpoints: [
      'GET    /api/productos',
      'GET    /api/productos/:id',
      'GET    /api/buscar?q=termino',
      'GET    /api/categorias',
      'POST   /api/carrito',
      'GET    /api/carrito/:id'
    ]
  });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
