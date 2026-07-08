import { ProductoRepository } from '../infraestructura/ProductoRepository';
import { UsuarioRepository } from '../infraestructura/UsuarioRepository';
import { SesionRepository } from '../infraestructura/SesionRepository';
import { PedidoRepository } from '../infraestructura/PedidoRepository';
import { PasswordResetRepository } from '../infraestructura/PasswordResetRepository';
import { AuthService } from './AuthService';
import { PedidoService } from './PedidoService';
import { PasswordResetService } from './PasswordResetService';

const productoRepo = new ProductoRepository();
const usuarioRepo = new UsuarioRepository();
const sesionRepo = new SesionRepository();
const pedidoRepo = new PedidoRepository();
const passwordResetRepo = new PasswordResetRepository();

export const authService = new AuthService(usuarioRepo, sesionRepo);
export const pedidoService = new PedidoService(pedidoRepo, productoRepo);
export const passwordResetService = new PasswordResetService(
  usuarioRepo,
  passwordResetRepo,
  sesionRepo
);
export { sesionRepo, productoRepo, usuarioRepo, pedidoRepo, passwordResetRepo };
