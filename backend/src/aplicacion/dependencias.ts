import { ProductoRepository } from '../infraestructura/ProductoRepository';
import { UsuarioRepository } from '../infraestructura/UsuarioRepository';
import { SesionRepository } from '../infraestructura/SesionRepository';
import { PedidoRepository } from '../infraestructura/PedidoRepository';
import { AuthService } from './AuthService';
import { PedidoService } from './PedidoService';

const productoRepo = new ProductoRepository();
const usuarioRepo = new UsuarioRepository();
const sesionRepo = new SesionRepository();
const pedidoRepo = new PedidoRepository();

export const authService = new AuthService(usuarioRepo, sesionRepo);
export const pedidoService = new PedidoService(pedidoRepo, productoRepo);
export { sesionRepo, productoRepo };
