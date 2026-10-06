import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeSpec } from '@/exam/papers';
import { checkPaperCode } from '@/ui/pages/home/paperCode';
import { externalLinkTarget, paperShareText, publicAppUrl } from './links';

const platform = vi.hoisted(() => ({ native: false }));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => platform.native },
  registerPlugin: () => ({}),
}));

const SITE = 'https://someone.github.io/net-cbt-simulator/';

function at(href: string, desktop = false) {
  vi.stubGlobal('window', {
    location: { href, hash: new URL(href).hash },
    ...(desktop ? { netcbtDesktop: { platform: 'desktop', version: '1.0.0' } } : {}),
  });
}

beforeEach(() => {
  platform.native = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('publicAppUrl', () => {
  it('builds website links from the current address, as before', () => {
    at('https://example.org/net/#/paper/ENG-K7Q2-9XM4?key=0');
    expect(publicAppUrl()).toBe('https://example.org/net/#/paper/ENG-K7Q2-9XM4?key=0');
    expect(publicAppUrl('/new?type=engineering&seed=K7Q29XM4', SITE)).toBe(
      'https://example.org/net/#/new?type=engineering&seed=K7Q29XM4',
    );
    expect(publicAppUrl('history', SITE)).toBe('https://example.org/net/#/history');

    at('https://example.org/net/');
    expect(publicAppUrl()).toBe('https://example.org/net/');
  });

  it('links to the published website from the app', () => {
    platform.native = true;
    at('https://localhost/#/bank?t=physics/work-energy/add-one');
    expect(publicAppUrl(undefined, SITE)).toBe(`${SITE}#/bank?t=physics/work-energy/add-one`);
    expect(publicAppUrl('/new?type=engineering&seed=K7Q29XM4', SITE)).toBe(
      `${SITE}#/new?type=engineering&seed=K7Q29XM4`,
    );

    at('https://localhost/');
    expect(publicAppUrl(undefined, SITE)).toBe(`${SITE}#/`);
  });

  it('links to the published website from the desktop app, never to app://', () => {
    at('app://bundle/index.html#/paper/ENG-K7Q2-9XM4?key=0', true);
    expect(publicAppUrl(undefined, SITE)).toBe(`${SITE}#/paper/ENG-K7Q2-9XM4?key=0`);
    expect(publicAppUrl('/new?type=engineering&seed=K7Q29XM4', SITE)).toBe(
      `${SITE}#/new?type=engineering&seed=K7Q29XM4`,
    );
    expect(publicAppUrl('/new', '')).toBeNull();
    expect(publicAppUrl(undefined, '')).toBeNull();
  });

  it('has no link in the app when the website is unknown', () => {
    platform.native = true;
    at('https://localhost/#/new');
    expect(publicAppUrl('/new', '')).toBeNull();
    expect(publicAppUrl(undefined, '')).toBeNull();
  });
});

describe('paperShareText', () => {
  it('names the code and opens the same paper from "Open a paper code"', () => {
    const text = paperShareText('ENG-K7Q2-9XM4', '/new?type=engineering&seed=K7Q29XM4&dyn=80');
    expect(text).toContain('ENG-K7Q2-9XM4');
    expect(checkPaperCode(text)).toMatchObject({
      ok: true,
      examType: 'engineering',
      code: 'ENG-K7Q2-9XM4',
      options: { dynamicShare: 0.8 },
    });
  });

  it('keeps the sections of a custom test', () => {
    const spec = {
      durationMinutes: 30,
      sections: [{ subject: 'physics' as const, count: 20 }],
    };
    const path = `/paper/CUS-K7Q2-9XM4?type=custom&spec=${encodeSpec(spec)}&key=0`;
    expect(checkPaperCode(paperShareText('CUS-K7Q2-9XM4', path))).toMatchObject({
      ok: true,
      examType: 'custom',
      code: 'CUS-K7Q2-9XM4',
      custom: { durationMinutes: 30 },
    });
  });
});

describe('externalLinkTarget', () => {
  it('says where links to other sites open', () => {
    expect(externalLinkTarget()).toBe('in a new tab');
    platform.native = true;
    expect(externalLinkTarget()).toBe('in your browser');
    platform.native = false;
    at('app://bundle/index.html#/about', true);
    expect(externalLinkTarget()).toBe('in your browser');
  });
});
