import { Router, Request, Response } from 'express';
import { ProductoService, CarritoService } from '../aplicacion/ProductoService';
import { ProductoRepository } from '../infraestructura/ProductoRepository';

export function routes(
  productoService: ProductoService = new ProductoService(new ProductoRepository()),
  carritoService: CarritoService = new CarritoService(new ProductoRepository())
): Router {
  const router = Router();

  router.get('/productos', async (_req: Request, res: Response) => {
    try {
      const productos = await productoService.listarProductos();
      res.json({ success: true, data: productos, total: productos.length });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al obtener productos' });
    }
  });

  router.get('/productos/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'ID invalido' });
      }
      const producto = await productoService.obtenerProductoPorId(id);
      if (!producto) {
        return res.status(404).json({ success: false, error: 'Producto no encontrado' });
      }
      res.json({ success: true, data: producto });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al obtener el producto' });
    }
  });

  router.get('/buscar', async (req: Request, res: Response) => {
    try {
      const termino = (req.query.q as string) || '';
      const resultados = await productoService.buscarProductos(termino);
      res.json({ success: true, data: resultados, total: resultados.length, termino });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error en la busqueda' });
    }
  });

  router.get('/categorias', async (_req: Request, res: Response) => {
    try {
      const categorias = await productoService.listarCategorias();
      res.json({ success: true, data: categorias });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al obtener categorias' });
    }
  });

  router.post('/carrito', async (req: Request, res: Response) => {
    try {
      const { productoId, cantidad } = req.body;
      if (!productoId || !cantidad) {
        return res.status(400).json({ success: false, error: 'productoId y cantidad son requeridos' });
      }
      const carrito = await carritoService.crearCarrito(productoId, cantidad);
      res.status(201).json({ success: true, data: carrito.toDTO() });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Error al crear carrito' });
    }
  });

  router.get('/carrito/:id', async (req: Request, res: Response) => {
    try {
      const carrito = await carritoService.obtenerCarrito(req.params.id);
      if (!carrito) {
        return res.status(404).json({ success: false, error: 'Carrito no encontrado' });
      }
      res.json({ success: true, data: carrito.toDTO() });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al obtener carrito' });
    }
  });

  return router;
}

export default routes();
