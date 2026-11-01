// Free local narration with Kokoro-82M (Apache-2.0), running on CPU via kokoro-js.
// The model (~90 MB at q8) downloads from Hugging Face once and is cached.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { env } from '@huggingface/transformers';
import { KokoroTTS } from 'kokoro-js';

// Keep the model outside node_modules so reinstalls don't re-download it and CI can cache it.
env.cacheDir = process.env.ATHENA_MODEL_CACHE || join(homedir(), '.cache', 'athena', 'models');

export interface Narration {
  wav: Uint8Array;
  durationSec: number;
}

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
export const DEFAULT_VOICE = 'af_heart';
type Voice = NonNullable<NonNullable<Parameters<KokoroTTS['generate']>[1]>['voice']>;

let model: Promise<KokoroTTS> | undefined;
const load = () => (model ??= KokoroTTS.from_pretrained(MODEL_ID, { dtype: 'q8', device: 'cpu' }));

export async function narrate(text: string, voice: string = DEFAULT_VOICE, speed = 1): Promise<Narration> {
  const tts = await load();
  const audio = await tts.generate(text, { voice: voice as Voice, speed });
  return {
    wav: new Uint8Array(audio.toWav()),
    durationSec: audio.audio.length / audio.sampling_rate,
  };
}

/** Frees the ONNX session. Without this, onnxruntime can abort while Node exits. */
export async function closeTts() {
  if (!model) return;
  const tts = await model;
  model = undefined;
  await tts.model.dispose();
}
