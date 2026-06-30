import { IItemCarrito } from './Carrito';
import { IPedido, Pedido } from './Pedido';
import { api } from '../servicios/ApiService';
import { Sesion } from './Sesion';

export interface IResultadoValidacion {
  valido: boolean;
  errores: string[];
}

export interface IDireccionEnvio {
  calle: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  pais?: string;
  telefono?: string;
  referencias?: string;
}

export class Checkout {
  private _sesion: Sesion;

  constructor(sesion: Sesion) {
    this._sesion = sesion;
  }

  public validar(items: IItemCarrito[]): IResultadoValidacion {
    const errores: string[] = [];

    if (!this._sesion.estaAutenticada()) {
      errores.push('Debes iniciar sesion para finalizar la compra');
    }
    if (!items || items.length === 0) {
      errores.push('El carrito esta vacio');
    }
    for (const item of items) {
      if (item.cantidad <= 0) {
        errores.push(`Cantidad invalida para ${item.producto.nombre}`);
      }
      if (item.producto.stock < item.cantidad) {
        errores.push(`Stock insuficiente para ${item.producto.nombre}`);
      }
      if (item.producto.precio < 0) {
        errores.push(`Precio invalido para ${item.producto.nombre}`);
      }
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  public validarDireccion(direccion: IDireccionEnvio): IResultadoValidacion {
    const errores: string[] = [];
    if (!direccion.calle || direccion.calle.trim().length < 3) {
      errores.push('La calle es obligatoria (minimo 3 caracteres)');
    }
    if (!direccion.ciudad || direccion.ciudad.trim().length < 2) {
      errores.push('La ciudad es obligatoria');
    }
    if (!direccion.estado || direccion.estado.trim().length < 2) {
      errores.push('El estado es obligatorio');
    }
    if (!direccion.codigoPostal || !/^\d{4,6}$/.test(direccion.codigoPostal.trim())) {
      errores.push('El codigo postal debe tener entre 4 y 6 digitos');
    }
    if (direccion.telefono && !/^[\d\s+\-()]{7,15}$/.test(direccion.telefono)) {
      errores.push('El telefono no tiene un formato valido');
    }
    return {
      valido: errores.length === 0,
      errores
    };
  }

  public async confirmar(items: IItemCarrito[], direccion: IDireccionEnvio): Promise<IPedido> {
    const validacionItems = this.validar(items);
    if (!validacionItems.valido) {
      throw new Error(validacionItems.errores.join(', '));
    }
    const validacionDir = this.validarDireccion(direccion);
    if (!validacionDir.valido) {
      throw new Error(validacionDir.errores.join(', '));
    }

    const total = items.reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0);
    const payload = {
      items: items.map(i => ({
        productoId: i.producto.id,
        cantidad: i.cantidad,
        precioUnitario: i.producto.precio
      })),
      total,
      direccionEnvio: direccion
    };

    const respuesta = await api.crearPedido(payload);
    return new Pedido(
      respuesta.id,
      respuesta.items,
      respuesta.total,
      respuesta.estado,
      respuesta.fecha,
      respuesta.direccionEnvio
    );
  }

  public mostrarResumen(items: IItemCarrito[]): string {
    if (items.length === 0) return 'Carrito vacio';
    const lineas = items.map(i => `${i.producto.nombre} x${i.cantidad} = $${(i.producto.precio * i.cantidad).toFixed(2)}`);
    const total = items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0);
    return `${lineas.join('\n')}\n\nTotal: $${total.toFixed(2)} MXN`;
  }
}
