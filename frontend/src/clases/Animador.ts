export class Animador {
  private _elemento: HTMLElement;
  private _animacionesActivas: Animation[] = [];

  constructor(elemento: HTMLElement) {
    this._elemento = elemento;
  }

  public get elemento(): HTMLElement { return this._elemento; }

  public fadeIn(duracion: number = 400): void {
    this._elemento.style.opacity = '0';
    this._elemento.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duracion, easing: 'ease-out', fill: 'forwards' }
    );
  }

  public slideIn(desde: 'left' | 'right' | 'top' | 'bottom' = 'right', duracion: number = 400): void {
    const transforms: Record<string, string[]> = {
      left: ['translateX(-100%)', 'translateX(0)'],
      right: ['translateX(100%)', 'translateX(0)'],
      top: ['translateY(-100%)', 'translateY(0)'],
      bottom: ['translateY(100%)', 'translateY(0)']
    };
    const anim = this._elemento.animate(
      [{ transform: transforms[desde][0], opacity: 0 }, { transform: transforms[desde][1], opacity: 1 }],
      { duration: duracion, easing: 'cubic-bezier(.25,.46,.45,.94)', fill: 'forwards' }
    );
    this._animacionesActivas.push(anim);
  }

  public shake(): void {
    this._elemento.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-8px)' },
        { transform: 'translateX(8px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(0)' }
      ],
      { duration: 400, easing: 'ease-in-out' }
    );
  }

  public bounce(): void {
    this._elemento.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.2)' },
        { transform: 'scale(0.95)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' }
      ],
      { duration: 500, easing: 'ease-out' }
    );
  }

  public pulsoInfinito(): void {
    this._elemento.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.05)', opacity: .8 },
        { transform: 'scale(1)', opacity: 1 }
      ],
      { duration: 1500, iterations: Infinity, easing: 'ease-in-out' }
    );
  }
}
