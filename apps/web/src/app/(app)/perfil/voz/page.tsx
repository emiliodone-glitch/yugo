'use client';

import { useEffect, useRef, useState } from 'react';
import { es, PROFILE_ANSWERS_TARGET, VOICE_NOTE_MAX_SECONDS } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import {
  useMyAnswers,
  useMyVoiceNote,
  useProfileQuestions,
  useRemoveAnswer,
  useRemoveVoiceNote,
  useSaveAnswer,
  useUploadVoiceNote,
} from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';

/**
 * Tu voz (RF-PER-09/12): tres respuestas cortas y un audio de veinte segundos.
 *
 * Es la parte del perfil que no se puede rellenar con un menú: dos personas
 * de la misma denominación y la misma ciudad se distinguen aquí. El audio
 * pasa por una persona del equipo antes de publicarse, y la pantalla lo dice.
 */
export default function VoicePage() {
  const questions = useProfileQuestions();
  const answers = useMyAnswers();
  const save = useSaveAnswer();
  const remove = useRemoveAnswer();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ tone: 'olive' | 'wine'; text: string } | null>(null);

  const answered = new Map((answers.data ?? []).map((row) => [row.question, row.answer]));
  const catalog = questions.data ?? [];
  const visibleKeys = [...new Set([...answered.keys(), ...picked])].filter((key) =>
    catalog.some((q) => q.key === key),
  );
  const remaining = catalog.filter((q) => !visibleKeys.includes(q.key));
  const answeredCount = [...answered.keys()].filter((key) =>
    catalog.some((q) => q.key === key),
  ).length;

  const draftOf = (key: string) => drafts[key] ?? answered.get(key) ?? '';

  const saveAnswer = async (key: string) => {
    const question = catalog.find((q) => q.key === key);
    const text = draftOf(key).trim();
    if (!question || !text) return;
    setNotice(null);
    try {
      await save.mutateAsync({ key, answer: text.slice(0, question.maxLength) });
      setNotice({ tone: 'olive', text: es.profile.answerSaved });
    } catch (caught) {
      const message = errorMessage(caught);
      setNotice({
        tone: 'wine',
        text: /answer_rejected|rechaz/i.test(message) ? es.profile.answerRejected : message,
      });
    }
  };

  return (
    <div className="pb-8">
      <PageHeader title={es.profile.voiceTitle} backHref="/perfil/editar" />
      <div className="px-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        <div>
          <p className="mb-3 text-[12.5px] text-muted">{es.profile.voiceSub}</p>
          {notice ? (
            <div
              role="status"
              className={`card border-0 text-[12.5px] ${
                notice.tone === 'olive' ? 'bg-olive-soft text-olive-text' : 'bg-wine-soft text-wine'
              }`}
            >
              {notice.text}
            </div>
          ) : null}

          <h2 className="h-display mb-1 text-[15px]">{es.profile.answersTitle}</h2>
          <p className="mb-2 text-[12px] text-muted">
            {es.profile.answersHint(answeredCount, PROFILE_ANSWERS_TARGET)}
          </p>

          {questions.isLoading ? (
            <div className="card text-sm text-muted">{es.common.loading}</div>
          ) : null}

          {visibleKeys.map((key) => {
            const question = catalog.find((q) => q.key === key);
            if (!question) return null;
            const value = draftOf(key);
            const dirty = value.trim() !== (answered.get(key) ?? '');
            return (
              <div key={key} className="card">
                <label className="block text-[12.5px] font-semibold text-olive-text">
                  {question.question}
                  <textarea
                    className="field mt-1.5 min-h-[76px] w-full font-normal text-ink"
                    value={value}
                    maxLength={question.maxLength}
                    placeholder={es.profile.answerPlaceholder}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                </label>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted">
                    {value.length} / {question.maxLength}
                  </span>
                  <div className="flex gap-1.5">
                    {answered.has(key) ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm w-auto px-3"
                        disabled={remove.isPending}
                        onClick={() => {
                          setPicked((current) => current.filter((item) => item !== key));
                          void remove.mutateAsync(key);
                        }}
                      >
                        {es.profile.answerRemove}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-olive btn-sm w-auto px-3"
                      disabled={!dirty || !value.trim() || save.isPending}
                      onClick={() => void saveAnswer(key)}
                    >
                      {es.profile.answerSave}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {remaining.length > 0 ? (
            <div className="card">
              <div className="text-[12px] font-semibold">{es.profile.answerPick}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {remaining.map((question) => (
                  <button
                    key={question.key}
                    type="button"
                    className="chip cursor-pointer hover:bg-linen-2"
                    onClick={() => setPicked((current) => [...current, question.key])}
                  >
                    {question.question}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <VoiceSection />
      </div>
    </div>
  );
}

/** Grabación con MediaRecorder: tope de tiempo, escucha previa y subida. */
function VoiceSection() {
  const mine = useMyVoiceNote();
  const upload = useUploadVoiceNote();
  const removeVoice = useRemoveVoiceNote();
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const [state, setState] = useState<'idle' | 'recording' | 'ready'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [take, setTake] = useState<{
    blob: Blob;
    mime: string;
    url: string;
    durationMs: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearInterval(timer.current);
      if (take?.url) URL.revokeObjectURL(take.url);
    },
    [take],
  );

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
  };

  const start = async () => {
    setError(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError(es.profile.audioNoMic);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const media = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      chunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      media.onstop = () => {
        const mime = (media.mimeType || preferred || 'audio/webm').split(';')[0];
        const blob = new Blob(chunks.current, { type: mime });
        const durationMs = Math.min(
          VOICE_NOTE_MAX_SECONDS * 1000,
          Math.max(1000, Date.now() - startedAt.current),
        );
        setTake({ blob, mime, url: URL.createObjectURL(blob), durationMs });
        setState('ready');
        stream.getTracks().forEach((track) => track.stop());
      };
      media.start();
      recorder.current = media;
      startedAt.current = Date.now();
      setSeconds(0);
      setState('recording');
      timer.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= VOICE_NOTE_MAX_SECONDS) stop();
      }, 250);
    } catch {
      setError(es.profile.audioNoMic);
    }
  };

  const reset = () => {
    if (take?.url) URL.revokeObjectURL(take.url);
    setTake(null);
    setSeconds(0);
    setState('idle');
  };

  const publish = async () => {
    if (!take) return;
    setError(null);
    try {
      await upload.mutateAsync({
        blob: take.blob,
        contentType: take.mime,
        durationMs: take.durationMs,
      });
      reset();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const current = mine.data ?? null;

  return (
    <div>
      <h2 className="h-display mb-1 mt-4 text-[15px] lg:mt-0">{es.profile.audioTitle}</h2>
      <p className="mb-2 text-[12px] text-muted">{es.profile.audioHint(VOICE_NOTE_MAX_SECONDS)}</p>

      {current ? (
        <div className="card">
          <div className="flex items-center justify-between gap-2">
            <b className="text-[12.5px]">
              {es.affinity.voiceSeconds(Math.round(current.durationMs / 1000))}
            </b>
            <span
              className={`chip ${
                current.status === 'APPROVED'
                  ? 'chip-olive'
                  : current.status === 'REJECTED'
                    ? 'chip-wine'
                    : 'chip-wheat'
              }`}
            >
              {current.status === 'APPROVED'
                ? 'Publicado'
                : current.status === 'REJECTED'
                  ? 'No aprobado'
                  : 'En revisión'}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted">{es.profile.audioStatus[current.status]}</p>
          {current.url ? (
            <audio controls preload="none" src={current.url} className="mt-2 w-full">
              Tu navegador no reproduce audio.
            </audio>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm mt-2 w-auto px-3"
            disabled={removeVoice.isPending}
            onClick={() => void removeVoice.mutateAsync()}
          >
            {es.profile.audioRemove}
          </button>
        </div>
      ) : null}

      <div className="card">
        {error ? (
          <p role="alert" className="mb-2 text-[12px] text-wine">
            {error}
          </p>
        ) : null}
        {state === 'recording' ? (
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-pulse rounded-full bg-wine motion-reduce:animate-none"
            />
            <b className="text-[14px] tabular-nums">
              {seconds} / {VOICE_NOTE_MAX_SECONDS} s
            </b>
            <button type="button" className="btn btn-sm ml-auto w-auto px-4" onClick={stop}>
              {es.profile.audioStop}
            </button>
          </div>
        ) : state === 'ready' && take ? (
          <>
            <audio controls src={take.url} className="w-full">
              Tu navegador no reproduce audio.
            </audio>
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                className="btn btn-olive btn-sm w-auto px-4"
                disabled={upload.isPending}
                onClick={() => void publish()}
              >
                {upload.isPending ? es.profile.audioUploading : es.profile.audioUpload}
              </button>
              <button type="button" className="btn btn-ghost btn-sm w-auto px-3" onClick={reset}>
                {es.profile.audioRerecord}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-olive btn-sm w-auto px-4"
            onClick={() => void start()}
          >
            {current ? es.profile.audioRerecord : es.profile.audioRecord}
          </button>
        )}
      </div>
    </div>
  );
}
