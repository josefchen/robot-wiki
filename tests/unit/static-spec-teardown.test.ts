import type { Browser } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';
import type { StaticExportServer } from '@/tests/e2e/static-export-server';

vi.mock('@playwright/test', () => ({
  test: {
    setTimeout: vi.fn(),
  },
}));

import { closeBrowserAndStopServer } from '@/tests/e2e/static-spec-teardown';

function browserWithClose(close: () => Promise<void>): Browser {
  return { close } as unknown as Browser;
}

function serverWithStop(stop: () => Promise<void>): StaticExportServer {
  return { port: 0, stop };
}

describe('closeBrowserAndStopServer', () => {
  it('resolves after both cleanups succeed', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const stop = vi.fn().mockResolvedValue(undefined);

    await expect(
      closeBrowserAndStopServer(
        browserWithClose(close),
        serverWithStop(stop),
      ),
    ).resolves.toBeUndefined();

    expect(close).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('throws the original rejection when exactly one cleanup fails', async () => {
    const browserError = new Error('browser close failed');
    const close = vi.fn().mockRejectedValue(browserError);
    const stop = vi.fn().mockResolvedValue(undefined);

    const rejection = closeBrowserAndStopServer(
      browserWithClose(close),
      serverWithStop(stop),
    );

    await expect(rejection).rejects.toBe(browserError);
    expect(close).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('throws both rejections in stable cleanup order when both fail', async () => {
    const browserError = new Error('browser close failed');
    const serverError = new Error('server stop failed');
    let rejectBrowserClose!: (reason: unknown) => void;
    const browserClose = new Promise<void>((_resolve, reject) => {
      rejectBrowserClose = reject;
    });
    const close = vi.fn().mockReturnValue(browserClose);
    const stop = vi.fn().mockRejectedValue(serverError);

    const rejection = closeBrowserAndStopServer(
      browserWithClose(close),
      serverWithStop(stop),
    );

    await Promise.resolve();
    expect(close).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();

    // The server rejects first, but diagnostics follow cleanup ownership
    // order rather than settlement timing.
    rejectBrowserClose(browserError);
    await expect(rejection).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors).toEqual([
        browserError,
        serverError,
      ]);
      return true;
    });
  });
});
