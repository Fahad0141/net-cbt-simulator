import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chunkText,
  isNativeApp,
  leaveApp,
  onAppPause,
  onBackButton,
  printPage,
  shareContent,
  shareTextFile,
} from './native';

const mocks = vi.hoisted(() => {
  const remove = vi.fn(() => Promise.resolve());
  return {
    native: false,
    print: vi.fn(() => Promise.resolve()),
    share: vi.fn((_options: unknown) => Promise.resolve({})),
    writeFile: vi.fn((_options: unknown) =>
      Promise.resolve({ uri: 'file:///data/cache/backup.json' }),
    ),
    appendFile: vi.fn((_options: unknown) => Promise.resolve()),
    remove,
    addListener: vi.fn((_event: string, _listener: unknown) => Promise.resolve({ remove })),
    minimizeApp: vi.fn(() => Promise.resolve()),
  };
});

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => mocks.native },
  registerPlugin: (name: string) => (name === 'Print' ? { print: mocks.print } : {}),
}));
vi.mock('@capacitor/share', () => ({ Share: { share: mocks.share } }));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile: mocks.writeFile, appendFile: mocks.appendFile },
}));
vi.mock('@capacitor/app', () => ({
  App: { addListener: mocks.addListener, minimizeApp: mocks.minimizeApp },
}));

/** Gives the dynamic imports and listener promises time to settle (a few ticks under load). */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
  mocks.native = false;
  vi.clearAllMocks();
});

describe('native platform helpers', () => {
  it('reports whether it runs inside the Android app', () => {
    expect(isNativeApp()).toBe(false);
    mocks.native = true;
    expect(isNativeApp()).toBe(true);
  });

  it('prints through the local Print plugin with a job name', async () => {
    await printPage('ENG-K7Q2-9XM4 · NET Engineering');
    expect(mocks.print).toHaveBeenCalledWith({ name: 'ENG-K7Q2-9XM4 · NET Engineering' });
  });

  it('opens the share sheet and treats closing it as a cancel, not an error', async () => {
    expect(await shareContent({ text: 'hello', url: 'https://example.org/#/' })).toBe(true);
    expect(mocks.share).toHaveBeenCalledWith({ text: 'hello', url: 'https://example.org/#/' });

    mocks.share.mockRejectedValueOnce(new Error('Share canceled'));
    expect(await shareContent({ text: 'hello' })).toBe(false);

    mocks.share.mockRejectedValueOnce(new Error('Unsupported url'));
    await expect(shareContent({ text: 'hello' })).rejects.toThrow('Unsupported url');
  });

  it('writes a UTF-8 file to the cache and shares it', async () => {
    expect(await shareTextFile('backup.json', '{"a":1}', 'History')).toBe(true);
    expect(mocks.writeFile).toHaveBeenCalledWith({
      path: 'backup.json',
      data: '{"a":1}',
      directory: 'CACHE',
      encoding: 'utf8',
    });
    expect(mocks.share).toHaveBeenCalledWith({
      title: 'History',
      files: ['file:///data/cache/backup.json'],
      dialogTitle: 'History',
    });
    expect(mocks.appendFile).not.toHaveBeenCalled();
  });

  it('writes a long file in pieces that add up to the text', async () => {
    const text = `{"a":"${'x'.repeat(1_200_000)}\u{1F600}"}`;
    expect(await shareTextFile('backup.json', text, 'History')).toBe(true);
    const pieces = [mocks.writeFile, mocks.appendFile].flatMap((fn) =>
      fn.mock.calls.map(([options]) => (options as { data: string }).data),
    );
    expect(pieces).toHaveLength(3);
    expect(pieces.join('')).toBe(text);
    for (const [options] of mocks.appendFile.mock.calls) {
      expect(options).toMatchObject({ path: 'backup.json', directory: 'CACHE', encoding: 'utf8' });
    }
    expect(mocks.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: ['file:///data/cache/backup.json'] }),
    );
  });

  it('never cuts a surrogate pair', () => {
    const emoji = '\u{1F600}';
    expect(chunkText('')).toEqual([]);
    expect(chunkText('abcdef', 4)).toEqual(['abcd', 'ef']);
    expect(chunkText(`abc${emoji}d`, 4)).toEqual(['abc', `${emoji}d`]);
    const pieces = chunkText(emoji.repeat(5), 3);
    expect(pieces.join('')).toBe(emoji.repeat(5));
    for (const piece of pieces) expect(piece).toBe(emoji);
  });

  it('listens for the app going to the background only in the app', async () => {
    const listener = vi.fn();
    onAppPause(listener)();
    await settle();
    expect(mocks.addListener).not.toHaveBeenCalled();

    mocks.native = true;
    const stop = onAppPause(listener);
    await vi.waitFor(() => expect(mocks.addListener).toHaveBeenCalledWith('pause', listener));
    await settle();
    stop();
    await vi.waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1));
  });

  it('removes a listener that is still being added', async () => {
    const stop = onBackButton(vi.fn());
    stop();
    await vi.waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1));
    expect(mocks.addListener).toHaveBeenCalledWith('backButton', expect.any(Function));
  });

  it('leaves the app by moving it to the background', async () => {
    await leaveApp();
    expect(mocks.minimizeApp).toHaveBeenCalledTimes(1);
  });
});
