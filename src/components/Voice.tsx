"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { useLang } from "./LangProvider";

// Voice for a parent with one free hand: tap the mic, talk, stop talking. The words fill the box as she speaks and
// are sent after a short pause. When she asked by voice, Pal reads its answer back.
// Uses the browser's own speech services (SpeechRecognition / speechSynthesis). In Chrome, recognition is done by
// Google's speech service, so audio does leave the device; the app itself never records or stores audio.
// Browsers without recognition (Firefox) simply don't show the mic.

const SILENCE_MS = 1600;
const MAX_MS = 60_000;

type Rec = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; abort(): void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
const SR = () => (typeof window === "undefined" ? null : ((window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition ?? null));

export function useVoice(onFinal: (text: string) => void, onInterim: (text: string) => void) {
  const { lang } = useLang();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  const text = useRef("");
  const silence = useRef<number | null>(null);
  const meter = useRef<{ ctx: AudioContext; stream: MediaStream; timer: number } | null>(null);
  const finalCb = useRef(onFinal); finalCb.current = onFinal;
  const interimCb = useRef(onInterim); interimCb.current = onInterim;
  useEffect(() => { setSupported(!!SR()); }, []);

  const cleanup = useCallback(() => {
    if (silence.current) window.clearTimeout(silence.current);
    if (meter.current) { window.clearInterval(meter.current.timer); meter.current.stream.getTracks().forEach((t) => t.stop()); meter.current.ctx.close().catch(() => {}); meter.current = null; }
    setLevel(0); setListening(false);
  }, []);

  const stop = useCallback((send = true) => {
    const r = rec.current; rec.current = null;
    try { r?.stop(); } catch {}
    cleanup();
    const said = text.current.trim(); text.current = "";
    if (send && said) finalCb.current(said);
  }, [cleanup]);

  const start = useCallback(async () => {
    const Ctor = SR(); if (!Ctor || rec.current) return;
    try { window.speechSynthesis?.cancel(); } catch {}
    setError(null); text.current = "";
    const r = new Ctor(); r.lang = lang === "zh" ? "zh-CN" : "en-US"; r.interimResults = true; r.continuous = true;
    let final = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) { const x = e.results[i]; if (x.isFinal) final += x[0].transcript + " "; else interim += x[0].transcript; }
      text.current = (final + interim).trim();
      interimCb.current(text.current);
      if (silence.current) window.clearTimeout(silence.current);
      silence.current = window.setTimeout(() => { if (rec.current === r) stop(true); }, SILENCE_MS);
    };
    r.onerror = (e) => { if (e.error !== "no-speech" && e.error !== "aborted") setError(e.error); };
    r.onend = () => { if (rec.current === r) stop(true); };
    rec.current = r;
    try { r.start(); } catch { rec.current = null; return; }
    setListening(true);
    window.setTimeout(() => { if (rec.current === r) stop(true); }, MAX_MS);
    try { // a small live level ring, so she can see Pal hears her
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const timer = window.setInterval(() => { an.getByteTimeDomainData(buf); let s = 0; for (let k = 0; k < buf.length; k++) { const v = (buf[k] - 128) / 128; s += v * v; } setLevel(Math.min(1, Math.sqrt(s / buf.length) * 6)); }, 80);
      meter.current = { ctx, stream, timer };
    } catch { /* no meter; recognition may still run */ }
  }, [lang, stop]);

  useEffect(() => () => { try { rec.current?.abort(); } catch {} cleanup(); }, [cleanup]);
  return { supported, listening, level, error, start, stop };
}

export function MicButton({ voice, className = "" }: { voice: ReturnType<typeof useVoice>; className?: string }) {
  const { t } = useLang();
  if (!voice.supported) return null;
  const on = voice.listening;
  return (
    <button
      type="button"
      onClick={() => (on ? voice.stop(true) : voice.start())}
      aria-label={on ? t("voice.stop") : t("voice.start")}
      title={on ? t("voice.stop") : t("voice.start")}
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${on ? "bg-red text-white" : "bg-primary-soft text-primary hover:bg-primary/15"} ${className}`}
    >
      {on && <span className="absolute inset-0 rounded-full ring-4 ring-red/30 transition-transform" style={{ transform: `scale(${1 + voice.level * 0.45})` }} />}
      {on ? <Square className="relative h-3.5 w-3.5" /> : <Mic className="relative h-4 w-4" />}
    </button>
  );
}

// Read an answer aloud in the UI language. Short and plain: headline, then the note.
export function speak(text: string, lang: "en" | "zh") {
  try {
    const s = window.speechSynthesis; if (!s || !text.trim()) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 600));
    u.lang = lang === "zh" ? "zh-CN" : "en-US";
    const v = s.getVoices().find((x) => x.lang.toLowerCase().startsWith(lang === "zh" ? "zh" : "en-us") && /samantha|female|google us english|ting-ting|xiaoxiao/i.test(x.name)) ?? s.getVoices().find((x) => x.lang.toLowerCase().startsWith(lang === "zh" ? "zh" : "en"));
    if (v) u.voice = v;
    u.rate = 1;
    s.speak(u);
  } catch {}
}
