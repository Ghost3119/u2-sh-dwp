import { UAParser } from 'ua-parser-js';

export interface IContextoCliente {
  dispositivo: string | null;
  ip: string | null;
  userAgent: string | null;
}

export function obtenerContextoCliente(
  userAgentHeader: string | undefined,
  ip: string | undefined
): IContextoCliente {
  const ua = userAgentHeader ?? null;
  let dispositivo: string | null = null;

  if (ua) {
    const parser = new UAParser(ua);
    const result = parser.getResult();
    const navegador = result.browser.name ?? 'Navegador desconocido';
    const so = result.os.name ?? 'SO desconocido';
    dispositivo = `${navegador} en ${so}`;
  }

  return {
    dispositivo,
    ip: ip ?? null,
    userAgent: ua
  };
}
