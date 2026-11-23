/** Test double for the Web Speech API's SpeechRecognition. Test-only. */
import type { RecognitionLike, RecognitionResultEventLike } from './dictationController';

export class FakeRecognition implements RecognitionLike {
  static instances: FakeRecognition[] = [];
  static failNextStart = false;

  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: RecognitionResultEventLike) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  startCalls = 0;
  stopCalls = 0;
  abortCalls = 0;
  running = false;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  static reset() {
    FakeRecognition.instances = [];
    FakeRecognition.failNextStart = false;
  }

  static last(): FakeRecognition {
    const instance = FakeRecognition.instances.at(-1);
    if (!instance) throw new Error('no FakeRecognition created');
    return instance;
  }

  start() {
    if (FakeRecognition.failNextStart) {
      FakeRecognition.failNextStart = false;
      throw new Error('InvalidStateError');
    }
    if (this.running) throw new Error('InvalidStateError: already started');
    this.startCalls += 1;
    this.running = true;
  }

  stop() {
    this.stopCalls += 1;
  }

  abort() {
    this.abortCalls += 1;
    this.running = false;
  }

  // --- helpers that simulate browser events ---

  emitResults(results: Array<{ transcript: string; isFinal: boolean }>, resultIndex = 0) {
    this.onresult?.({
      resultIndex,
      results: results.map((r) => ({ isFinal: r.isFinal, 0: { transcript: r.transcript } })),
    });
  }

  emitFinal(transcript: string) {
    this.emitResults([{ transcript, isFinal: true }]);
  }

  emitInterim(transcript: string) {
    this.emitResults([{ transcript, isFinal: false }]);
  }

  emitError(error: string) {
    this.onerror?.({ error });
  }

  /** Browser ended recognition (silence, after stop(), or after an error). */
  emitEnd() {
    this.running = false;
    this.onend?.();
  }
}
