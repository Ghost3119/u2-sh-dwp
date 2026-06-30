export function formatearPrecio(precio: number): string {
  return `$${precio.toFixed(2)} MXN`;
}

export function generarEstrellas(rating: number): string {
  const llenas = Math.floor(rating);
  const media = rating % 1 >= 0.5 ? 1 : 0;
  const vacias = 5 - llenas - media;
  return '★'.repeat(llenas) + (media ? '⯨' : '') + '☆'.repeat(vacias);
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number = 300): T {
  let timer: number | undefined;
  return ((...args: any[]) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  }) as T;
}

export function mostrarToast(mensaje: string, duracion: number = 2000): void {
  const toastExistente = document.querySelector('.toast');
  if (toastExistente) toastExistente.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duracion);
}
