import { api } from '../servicios/ApiService';
import { mostrarToast } from '../servicios/utilidades';
import { Animador } from './Animador';

export type PasoRecuperacion = 'solicitar' | 'resetear' | 'exito';

export interface IContextoRecuperacion {
  email: string;
  token: string;
}

export class RecuperacionPassword {
  private _contenedor: HTMLElement;
  private _contexto: IContextoRecuperacion = { email: '', token: '' };
  private _paso: PasoRecuperacion = 'solicitar';
  private _manejadorCerrar?: () => void;
  private _manejadorIrLogin?: () => void;

  constructor(contenedorId: string = 'modal-recuperar') {
    const cont = document.getElementById(contenedorId);
    if (!cont) throw new Error(`Contenedor #${contenedorId} no encontrado`);
    this._contenedor = cont;
  }

  public get paso(): PasoRecuperacion { return this._paso; }
  public get contexto(): IContextoRecuperacion { return { ...this._contexto }; }

  public onCerrar(manejador: () => void): void {
    this._manejadorCerrar = manejador;
  }

  public onIrLogin(manejador: () => void): void {
    this._manejadorIrLogin = manejador;
  }

  public inicializar(): void {
    this.configurarEventosDelegados();
    this.renderizarPaso();
  }

  public abrir(manejadorCerrar: () => void, manejadorIrLogin: () => void): void {
    this._manejadorCerrar = manejadorCerrar;
    this._manejadorIrLogin = manejadorIrLogin;
    this._paso = 'solicitar';
    this._contexto = { email: '', token: '' };
    this.renderizarPaso();
    manejadorCerrar();
    this.configurarEventosDelegados();
  }

  public irAPaso(paso: PasoRecuperacion): void {
    this._paso = paso;
    this.renderizarPaso();
  }

  private configurarEventosDelegados(): void {
    const formSolicitar = document.getElementById('form-recuperar-solicitar');
    if (formSolicitar) {
      formSolicitar.addEventListener('submit', (e: Event) => this.handleSolicitar(e));
    }
    const formResetear = document.getElementById('form-recuperar-resetear');
    if (formResetear) {
      formResetear.addEventListener('submit', (e: Event) => this.handleResetear(e));
    }
    const btnCerrarExito = document.getElementById('btn-recuperar-ir-login');
    if (btnCerrarExito) {
      btnCerrarExito.addEventListener('click', () => {
        if (this._manejadorIrLogin) this._manejadorIrLogin();
      });
    }
    const btnVolverLogin = document.getElementById('btn-recuperar-volver-login');
    if (btnVolverLogin) {
      btnVolverLogin.addEventListener('click', () => {
        if (this._manejadorIrLogin) this._manejadorIrLogin();
      });
    }
  }

  private async handleSolicitar(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const errorEl = document.getElementById('recuperar-solicitar-error');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (errorEl) errorEl.textContent = 'Ingresa un email valido';
      form.classList.add('shake-form');
      setTimeout(() => form.classList.remove('shake-form'), 450);
      return;
    }

    if (errorEl) errorEl.textContent = '';

    const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Enviando...';
    }

    try {
      const respuesta = await api.solicitarRecuperacion(email);
      this._contexto.email = email;
      this._contexto.token = respuesta.token ?? respuesta.resetToken ?? '';
      this.irAPaso('resetear');
      mostrarToast('Se ha generado un enlace de recuperacion');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo enviar el enlace';
      if (errorEl) errorEl.textContent = mensaje;
      form.classList.add('shake-form');
      setTimeout(() => form.classList.remove('shake-form'), 450);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Enviar enlace';
      }
    }
  }

  private async handleResetear(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const tokenIngresado = (form.elements.namedItem('token') as HTMLInputElement).value.trim();
    const nuevoPassword = (form.elements.namedItem('nuevoPassword') as HTMLInputElement).value;
    const confirmarPassword = (form.elements.namedItem('confirmarPassword') as HTMLInputElement).value;
    const errorEl = document.getElementById('recuperar-resetear-error');

    if (!tokenIngresado) {
      if (errorEl) errorEl.textContent = 'Pega el token recibido';
      this.shakeForm(form);
      return;
    }
    if (nuevoPassword.length < 6) {
      if (errorEl) errorEl.textContent = 'La contrasena debe tener al menos 6 caracteres';
      this.shakeForm(form);
      return;
    }
    if (nuevoPassword !== confirmarPassword) {
      if (errorEl) errorEl.textContent = 'Las contrasenas no coinciden';
      this.shakeForm(form);
      return;
    }

    if (errorEl) errorEl.textContent = '';

    const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Cambiando...';
    }

    try {
      await api.resetearPassword(tokenIngresado, nuevoPassword);
      this.irAPaso('exito');
      mostrarToast('Contrasena actualizada correctamente');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cambiar la contrasena';
      if (errorEl) errorEl.textContent = mensaje;
      this.shakeForm(form);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Cambiar contrasena';
      }
    }
  }

  private shakeForm(form: HTMLElement): void {
    form.classList.add('shake-form');
    setTimeout(() => form.classList.remove('shake-form'), 450);
  }

  private renderizarPaso(): void {
    const solic = document.getElementById('recuperar-paso-solicitar');
    const reset = document.getElementById('recuperar-paso-resetear');
    const exito = document.getElementById('recuperar-paso-exito');
    if (!solic || !reset || !exito) return;

    solic.classList.toggle('oculto', this._paso !== 'solicitar');
    reset.classList.toggle('oculto', this._paso !== 'resetear');
    exito.classList.toggle('oculto', this._paso !== 'exito');

    if (this._paso === 'resetear') {
      const tokenEl = document.getElementById('recuperar-token-desarrollo');
      if (tokenEl) {
        tokenEl.textContent = this._contexto.token
          ? this._contexto.token
          : '(El backend no devolvio un token. Revisa tu correo electronico)';
        tokenEl.classList.toggle('token-vacio', !this._contexto.token);
      }
      const inputToken = document.getElementById('recuperar-token') as HTMLInputElement | null;
      if (inputToken && this._contexto.token) {
        inputToken.value = this._contexto.token;
      }
    }

    const cont = this._contenedor.querySelector('.modal-contenido') as HTMLElement | null;
    if (cont) {
      const anim = new Animador(cont);
      anim.fadeIn(250);
    }
  }
}
