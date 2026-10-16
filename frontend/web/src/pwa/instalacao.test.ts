import { describe, expect, it } from 'vitest';
import { deveMostrarAvisoInstalacao, type AmbienteInstalacao } from './instalacao';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPOD = IPHONE_SAFARI.replace('iPhone', 'iPod touch');
const IPAD_SAFARI = IPHONE_SAFARI.replace('iPhone; CPU iPhone OS', 'iPad; CPU OS');
const IPADOS_COMO_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

const base = (userAgent: string, resto: Partial<AmbienteInstalacao> = {}): AmbienteInstalacao => ({
  userAgent,
  maxTouchPoints: 5,
  standalone: false,
  navigatorStandalone: undefined,
  ...resto,
});

describe('deveMostrarAvisoInstalacao', () => {
  it.each([
    ['iPhone Safari', base(IPHONE_SAFARI)],
    ['iPod', base(IPOD)],
    ['iPad Safari', base(IPAD_SAFARI)],
    ['iPadOS como Macintosh com toque', base(IPADOS_COMO_MAC, { maxTouchPoints: 5 })],
    ['navigator.standalone falso', base(IPHONE_SAFARI, { navigatorStandalone: false })],
  ])('mostra: %s', (_nome, ambiente) => {
    expect(deveMostrarAvisoInstalacao(ambiente)).toBe(true);
  });

  it.each([
    ['standalone verdadeiro', base(IPHONE_SAFARI, { standalone: true })],
    ['navigator.standalone verdadeiro', base(IPHONE_SAFARI, { navigatorStandalone: true })],
    ['Chrome no iOS', base(IPHONE_SAFARI + ' CriOS/130.0')],
    ['Firefox no iOS', base(IPHONE_SAFARI + ' FxiOS/130.0')],
    ['Edge no iOS', base(IPHONE_SAFARI + ' EdgiOS/130.0')],
    ['Opera no iOS', base(IPHONE_SAFARI + ' OPiOS/16.0')],
    ['app do Google', base(IPHONE_SAFARI + ' GSA/300.0')],
    ['Instagram embutido', base(IPHONE_SAFARI + ' Instagram 300.0')],
    ['Facebook embutido', base(IPHONE_SAFARI + ' [FBAN/FBIOS;FBAV/450.0]')],
    ['Safari do Mac (sem toque)', base(IPADOS_COMO_MAC, { maxTouchPoints: 0 })],
    [
      'Android Chrome',
      base('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'),
    ],
    [
      'Windows',
      base('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36', {
        maxTouchPoints: 0,
      }),
    ],
    ['UA vazio', base('')],
    [
      'iPhone dentro de outro produto no Android',
      base('Mozilla/5.0 (Linux; Android 14) iPhone-like Mobile Safari/537.36'),
    ],
  ])('não mostra: %s', (_nome, ambiente) => {
    expect(deveMostrarAvisoInstalacao(ambiente)).toBe(false);
  });
});
