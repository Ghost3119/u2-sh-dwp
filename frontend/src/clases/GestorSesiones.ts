import { api, ISesionRemota } from '../servicios/ApiService';
import { mostrarToast } from '../servicios/utilidades';
import { Animador } from './Animador';

export class GestorSesiones {
  private _sesiones: ISesionRemota[] = [];
  private _contenedorId: string;
  private _cargando: boolean = false;

  constructor(contenedorId: string = 'seccion-sesiones') {
    this._contenedorId = contenedorId;
  }

  public get sesiones(): ISesionRemota[] { return [...this._sesiones]; }

  public async cargar(): Promise<void> {
    if (this._cargando) return;
    this._cargando = true;
    this.renderizarCargando();
    try {
      this._sesiones = await api.obtenerSesiones();
      this.renderizar();
    } catch (error) {
      this.renderizarError(error instanceof Error ? error.message : 'No se pudieron cargar las sesiones');
    } finally {
      this._cargando = false;
    }
  }

  public async cerrarSesion(id: number | string): Promise<boolean> {
    if (!confirm('Cerrar esta sesion? El dispositivo perdera el acceso.')) return false;
    try {
      await api.cerrarSesionRemota(id);
      mostrarToast('Sesion cerrada');
      await this.cargar();
      return true;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cerrar la sesion';
      mostrarToast(mensaje, 3000);
      return false;
    }
  }

  public async cerrarOtras(): Promise<void> {
    const otras = this._sesiones.filter(s => !this.esSesionActual(s));
    if (otras.length === 0) {
      mostrarToast('No hay otras sesiones activas');
      return;
    }
    if (!confirm(`Cerrar ${otras.length} sesion(es) en otros dispositivos?`)) return;
    try {
      const r = await api.cerrarOtrasSesiones();
      mostrarToast(r.mensaje || `${r.cerradas} sesion(es) cerradas`);
      await this.cargar();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cerrar las sesiones';
      mostrarToast(mensaje, 3000);
    }
  }

  public esSesionActual(s: ISesionRemota): boolean {
    return Boolean(s.actual ?? s.esActual);
  }

  public dispositivoLegible(s: ISesionRemota): string {
    if (s.dispositivo && s.dispositivo.trim().length > 0) return s.dispositivo;
    const ua = s.userAgent ?? '';
    if (!ua) return 'Dispositivo desconocido';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad/i.test(ua)) return 'iOS';
    if (/Edg/i.test(ua)) return 'Edge';
    if (/Chrome/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua)) return 'Safari';
    return 'Navegador';
  }

  public navegadorLegible(s: ISesionRemota): string {
    const ua = s.userAgent ?? '';
    if (/Edg/i.test(ua)) return 'Edge';
    if (/Chrome/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua)) return 'Safari';
    return '';
  }

  public fechaLegible(s: ISesionRemota): string {
    const f = s.fechaCreacion ?? s.createdAt;
    if (!f) return 'Fecha desconocida';
    try {
      return new Date(f).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return f;
    }
  }

  public mostrar(contenedorVisibleId?: string): void {
    const cont = document.getElementById(this._contenedorId);
    if (!cont) return;
    cont.classList.remove('oculto');
    const anim = new Animador(cont);
    anim.fadeIn(350);
    if (contenedorVisibleId) {
      const otrosIds = ['seccion-pedidos', 'seccion-admin'];
      otrosIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('oculto');
      });
    }
    this.cargar();
  }

  public ocultar(): void {
    const cont = document.getElementById(this._contenedorId);
    if (cont) cont.classList.add('oculto');
  }

  private renderizarCargando(): void {
    const cont = document.getElementById('sesiones-contenido');
    if (!cont) return;
    cont.innerHTML = '<p class="cargando">Cargando sesiones...</p>';
  }

  private renderizarError(mensaje: string): void {
    const cont = document.getElementById('sesiones-contenido');
    if (!cont) return;
    cont.innerHTML = `<p class="form-error">${mensaje}</p>`;
  }

  private renderizar(): void {
    const cont = document.getElementById('sesiones-contenido');
    if (!cont) return;
    if (this._sesiones.length === 0) {
      cont.innerHTML = '<p class="cargando">No tienes sesiones activas.</p>';
      return;
    }

    const otras = this._sesiones.filter(s => !this.esSesionActual(s));

    cont.innerHTML = `
      <div class="sesiones-acciones-top">
        <button class="btn-auth btn-cerrar-otras" id="btn-cerrar-otras" ${otras.length === 0 ? 'disabled' : ''}>
          Cerrar todas las demas (${otras.length})
        </button>
      </div>
      <div class="sesiones-lista">
        ${this._sesiones.map(s => this.renderizarSesion(s)).join('')}
      </div>
    `;

    const btnCerrarOtras = document.getElementById('btn-cerrar-otras');
    if (btnCerrarOtras) {
      btnCerrarOtras.addEventListener('click', () => this.cerrarOtras());
    }

    cont.querySelectorAll('[data-cerrar-sesion]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.cerrarSesion;
        if (id) this.cerrarSesion(id);
      });
    });

    cont.querySelectorAll('.sesion-card').forEach(card => {
      const htmlCard = card as HTMLElement;
      htmlCard.addEventListener('mouseenter', () => htmlCard.classList.add('hover'));
      htmlCard.addEventListener('mouseleave', () => htmlCard.classList.remove('hover'));
    });
  }

  private renderizarSesion(s: ISesionRemota): string {
    const esActual = this.esSesionActual(s);
    const nav = this.navegadorLegible(s);
    const disp = this.dispositivoLegible(s);
    const ip = s.ip ?? 'IP desconocida';
    return `
      <div class="sesion-card ${esActual ? 'sesion-actual' : ''}">
        <div class="sesion-info">
          <div class="sesion-titulo">
            <strong>${disp}${nav && !disp.includes(nav) ? ' / ' + nav : ''}</strong>
            ${esActual ? '<span class="badge-actual">Sesion actual</span>' : ''}
          </div>
          <div class="sesion-meta">
            <span>IP: ${ip}</span>
            <span>Creada: ${this.fechaLegible(s)}</span>
          </div>
        </div>
        <div class="sesion-acciones">
          ${esActual
            ? '<span class="sesion-actual-texto">No se puede cerrar</span>'
            : `<button class="btn-auth btn-cerrar-sesion" data-cerrar-sesion="${s.id}">Cerrar</button>`}
        </div>
      </div>
    `;
  }
}
