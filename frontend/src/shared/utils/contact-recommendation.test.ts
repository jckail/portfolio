import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postJson } = vi.hoisted(() => ({ postJson: vi.fn() }));

vi.mock('./api', () => ({ postJson }));

describe('contact recommendations', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    postJson.mockReset();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(new AbortController().signal);
  });

  it.each(['opportunity', 'collaboration', 'question'] as const)(
    'sends only the fixed %s intent and bounds the request lifetime',
    async intent => {
      postJson.mockResolvedValue({ message: ' Hi Jordan, could we connect? ' });
      const { recommendContactMessage } = await import('./contact-recommendation');

      await expect(recommendContactMessage(intent)).resolves.toBe('Hi Jordan, could we connect?');
      expect(postJson).toHaveBeenCalledExactlyOnceWith('/api/contact/draft', { intent }, {
        signal: expect.any(AbortSignal),
      });
      expect(AbortSignal.timeout).toHaveBeenCalledExactlyOnceWith(18000);
      expect(Object.keys(postJson.mock.calls[0][1])).toEqual(['intent']);
    }
  );

  it('shares an in-flight request and reuses its result without another model request', async () => {
    let resolveDraft: (value: { message: string }) => void = () => undefined;
    postJson.mockImplementation(() => new Promise<{ message: string }>(resolve => {
      resolveDraft = resolve;
    }));
    const { recommendContactMessage } = await import('./contact-recommendation');

    const first = recommendContactMessage('opportunity');
    const second = recommendContactMessage('opportunity');
    expect(second).toBe(first);
    expect(postJson).toHaveBeenCalledTimes(1);

    resolveDraft({ message: 'Hi Jordan, could we connect?' });
    await expect(first).resolves.toBe('Hi Jordan, could we connect?');
    expect(recommendContactMessage('opportunity')).toBe(first);
    expect(postJson).toHaveBeenCalledTimes(1);
  });

  it('keeps recommendations for different intents separate', async () => {
    postJson.mockResolvedValue({ message: 'Hi Jordan, could we connect?' });
    const { recommendContactMessage } = await import('./contact-recommendation');

    await recommendContactMessage('opportunity');
    await recommendContactMessage('collaboration');
    expect(postJson).toHaveBeenCalledTimes(2);
    expect(postJson.mock.calls.map(call => call[1])).toEqual([
      { intent: 'opportunity' }, { intent: 'collaboration' },
    ]);
  });

  it('expires successful recommendations after five minutes', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    postJson.mockResolvedValue({ message: 'Hi Jordan, could we connect?' });
    const { recommendContactMessage } = await import('./contact-recommendation');

    const first = recommendContactMessage('question');
    await first;
    now.mockReturnValue(300999);
    expect(recommendContactMessage('question')).toBe(first);
    now.mockReturnValue(301000);
    const fresh = recommendContactMessage('question');
    expect(fresh).not.toBe(first);
    await fresh;
    expect(postJson).toHaveBeenCalledTimes(2);
  });

  it.each([
    undefined, null, {}, { message: 42 }, { message: '' },
    { message: '   ' }, { message: 'x'.repeat(1201) },
  ])('rejects an invalid recommendation and permits a later retry: %j', async result => {
    postJson.mockResolvedValueOnce(result).mockResolvedValueOnce({
      message: 'Hi Jordan, could we connect?',
    });
    const { recommendContactMessage } = await import('./contact-recommendation');

    await expect(recommendContactMessage('question')).rejects.toThrow('Recommendation unavailable');
    expect(postJson).toHaveBeenCalledTimes(1);
    await expect(recommendContactMessage('question')).resolves.toBe('Hi Jordan, could we connect?');
    expect(postJson).toHaveBeenCalledTimes(2);
  });

  it('accepts the maximum bounded recommendation length', async () => {
    postJson.mockResolvedValue({ message: 'x'.repeat(1200) });
    const { recommendContactMessage } = await import('./contact-recommendation');
    await expect(recommendContactMessage('question')).resolves.toHaveLength(1200);
  });

  it('propagates unavailability without automatic retries, then retries on a new request', async () => {
    const unavailable = new Error('AI recommendation unavailable');
    postJson.mockRejectedValueOnce(unavailable).mockResolvedValueOnce({
      message: 'Hi Jordan, could we connect?',
    });
    const { recommendContactMessage } = await import('./contact-recommendation');

    await expect(recommendContactMessage('collaboration')).rejects.toBe(unavailable);
    expect(postJson).toHaveBeenCalledTimes(1);
    await expect(recommendContactMessage('collaboration')).resolves.toBe('Hi Jordan, could we connect?');
    expect(postJson).toHaveBeenCalledTimes(2);
  });
});
