import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { App } from './App';
import { ERROR_MESSAGES, organizeStoryRequest } from './api/organizeStory';
import { STORY, deferredResponse, field, fillValidStory, jsonResponse, mockFetch, sampleResult } from './test/helpers';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const organizeButton = () => screen.getByRole('button', { name: /Organize My Story|Organizing your story/ });

describe('AC-01: Organize My Story sends exactly one request', () => {
  it('AC-01: sends one POST with the age and story, and shows loading until the result', async () => {
    const pending = deferredResponse();
    const fetchMock = mockFetch(() => pending.promise);
    render(<App />);
    fillValidStory(STORY, '2.5', 'years');

    fireEvent.click(organizeButton());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/organize-story');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      childAge: { value: 2.5, unit: 'years' },
      narrative: STORY,
    });

    expect(organizeButton()).toBeDisabled();
    expect(organizeButton()).toHaveTextContent('Organizing your story…');
    expect(screen.getByRole('status')).toHaveTextContent(/Organizing your story/);

    await act(async () => pending.resolve(jsonResponse(200, sampleResult())));
    expect(await screen.findByRole('heading', { name: 'Your organized story' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('AC-01: repeated clicks and Enter while waiting do not send a second request', async () => {
    const pending = deferredResponse();
    const fetchMock = mockFetch(() => pending.promise);
    render(<App />);
    fillValidStory();

    fireEvent.click(organizeButton());
    fireEvent.click(organizeButton());
    fireEvent.submit(field.story().closest('form') as HTMLFormElement);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(jsonResponse(200, sampleResult())));
  });

  it('AC-02: invalid input makes no request', () => {
    const fetchMock = mockFetch();
    render(<App />);
    fillValidStory('Too short.');
    fireEvent.click(organizeButton());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('AC-16: failed or timed-out request', () => {
  it.each([
    [504, ERROR_MESSAGES.timeout],
    [502, ERROR_MESSAGES.failed],
    [500, ERROR_MESSAGES.failed],
    [503, ERROR_MESSAGES.failed],
  ])('AC-16: HTTP %i shows a friendly error with Try again and keeps the text', async (status, message) => {
    mockFetch(
      jsonResponse(status, { error: 'x', message: 'INTERNAL stack trace sk-secret-123' }),
      jsonResponse(200, sampleResult()),
    );
    render(<App />);
    fillValidStory();
    fireEvent.click(organizeButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(message);
    expect(document.body).not.toHaveTextContent(/INTERNAL|stack trace|sk-secret/);
    expect(field.story().value).toBe(STORY);
    expect(field.age().value).toBe('3');
    expect(organizeButton()).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('AC-16: a network failure shows the friendly error and keeps the text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    render(<App />);
    fillValidStory();
    fireEvent.click(organizeButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(ERROR_MESSAGES.failed);
    expect(field.story().value).toBe(STORY);
  });

  it('AC-16: Try again sends the story as it is now, after an edit', async () => {
    const fetchMock = mockFetch(jsonResponse(504, {}), jsonResponse(200, sampleResult()));
    render(<App />);
    fillValidStory();
    fireEvent.click(organizeButton());
    await screen.findByRole('alert');

    const edited = `${STORY} He also likes music.`;
    fireEvent.change(field.story(), { target: { value: edited } });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const body = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(body.narrative).toBe(edited);
  });

  it('AC-16: a malformed 200 response is treated as a failure, not shown', async () => {
    mockFetch(jsonResponse(200, { categories: { main_concerns: [] } }));
    render(<App />);
    fillValidStory();
    fireEvent.click(organizeButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(ERROR_MESSAGES.failed);
  });

  it('AC-16: the client gives up after its own timeout and reports it as a timeout', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const outcome = organizeStoryRequest(
      { childAge: { value: 3, unit: 'years' }, narrative: STORY },
      { fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 1000 },
    );
    await vi.advanceTimersByTimeAsync(1000);
    await expect(outcome).resolves.toEqual({ ok: false, kind: 'timeout', message: ERROR_MESSAGES.timeout });
  });
});

describe('AC-18: rate limit', () => {
  it('AC-18: HTTP 429 shows a friendly message and keeps the text', async () => {
    mockFetch(jsonResponse(429, { error: 'rate_limited' }));
    render(<App />);
    fillValidStory();
    fireEvent.click(organizeButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(ERROR_MESSAGES.rate_limited);
    expect(field.story().value).toBe(STORY);
  });
});
