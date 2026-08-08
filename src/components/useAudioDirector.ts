"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Cue = "action" | "collect" | "hazard" | "arcade_start" | "arcade_win" | "arcade_fail" | "judgment";
type AudioStatus = "armed" | "active" | "muted";

const VOLUME_KEY = "extrcuse-sound-volume";
const MUTED_KEY = "extrcuse-sound-muted";

export function audioCueForChaos(level: number) {
  if (level <= 2) return { caption: "GLASSY CLICK ACQUIRED", notes: [740, 988], wave: "sine" as OscillatorType };
  if (level <= 5) return { caption: "MODEM NEGOTIATIONS INTENSIFY", notes: [220, 440, 330, 660], wave: "square" as OscillatorType };
  if (level <= 7) return { caption: "PIGEON COMMS ONLINE", notes: [523, 784, 659], wave: "sawtooth" as OscillatorType };
  return { caption: "OFFICE CHAOS BEEP MIX", notes: [196, 392, 784, 587], wave: "square" as OscillatorType };
}

function cueSpec(cue: Cue, level: number) {
  if (cue === "action") return audioCueForChaos(level);
  if (cue === "collect") return { caption: "FORM ACQUIRED", notes: [880, 1175], wave: "square" as OscillatorType };
  if (cue === "hazard") return { caption: "RED TAPE ENCOUNTERED", notes: [180, 120], wave: "sawtooth" as OscillatorType };
  if (cue === "arcade_start") return { caption: "PAPERWORK PANIC ONLINE", notes: [196, 392, 523, 784], wave: "square" as OscillatorType };
  if (cue === "arcade_win") return { caption: "BUREAUCRACY DEFEATED TEMPORARILY", notes: [523, 659, 784, 1047], wave: "square" as OscillatorType };
  if (cue === "arcade_fail") return { caption: "FORM MISFILED WITH CONFIDENCE", notes: [247, 196, 147], wave: "sawtooth" as OscillatorType };
  return { caption: "FINAL JUDGMENT SLAM", notes: [98, 196, 392], wave: "square" as OscillatorType };
}

export function useAudioDirector() {
  const contextRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const arcadeTimerRef = useRef<number | null>(null);
  const captionTimerRef = useRef<number | null>(null);
  const activatedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.25);
  const [caption, setCaption] = useState("");
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    const savedVolume = Number(window.localStorage.getItem(VOLUME_KEY));
    const savedMuted = window.localStorage.getItem(MUTED_KEY);
    const frame = window.requestAnimationFrame(() => {
      if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) setVolumeState(savedVolume);
      if (savedMuted === "true") setMuted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const announce = useCallback((message: string) => {
    setCaption(message);
    if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
    captionTimerRef.current = window.setTimeout(() => setCaption(""), 1700);
  }, []);

  const ensureContext = useCallback(() => {
    if (!contextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      const context = new AudioContextClass();
      const master = context.createGain();
      master.connect(context.destination);
      contextRef.current = context;
      masterRef.current = master;
    }
    void contextRef.current.resume();
    return contextRef.current;
  }, []);

  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.setTargetAtTime(muted ? 0 : volume, masterRef.current.context.currentTime, 0.01);
  }, [muted, volume]);

  const play = useCallback((cue: Cue, level: number) => {
    const spec = cueSpec(cue, level);
    announce(spec.caption);
    if (muted) return;
    const context = ensureContext();
    const master = masterRef.current;
    if (!context || !master) return;
    const start = context.currentTime;
    spec.notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * 0.075;
      oscillator.type = spec.wave;
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.13);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.15);
    });
  }, [announce, ensureContext, muted]);

  const activateForAction = useCallback((level: number) => {
    if (!activatedRef.current) {
      activatedRef.current = true;
      setActivated(true);
    }
    play("action", level);
  }, [play]);

  const stopArcade = useCallback(() => {
    if (arcadeTimerRef.current) window.clearInterval(arcadeTimerRef.current);
    arcadeTimerRef.current = null;
  }, []);

  const startArcade = useCallback((level: number) => {
    stopArcade();
    play("arcade_start", level);
    if (muted) return;
    let step = 0;
    arcadeTimerRef.current = window.setInterval(() => {
      const notes = [262, 330, 392, 523];
      const context = contextRef.current;
      const master = masterRef.current;
      if (!context || !master) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = notes[step % notes.length];
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.11);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
      step += 1;
    }, 280);
  }, [muted, play, stopArcade]);

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      window.localStorage.setItem(MUTED_KEY, String(next));
      if (next) stopArcade();
      return next;
    });
  }, [stopArcade]);

  const setVolume = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    setVolumeState(clamped);
    window.localStorage.setItem(VOLUME_KEY, String(clamped));
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stopArcade();
        void contextRef.current?.suspend();
      } else if (activatedRef.current && !muted) {
        void contextRef.current?.resume();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopArcade();
      if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
      void contextRef.current?.close();
    };
  }, [muted, stopArcade]);

  const status: AudioStatus = muted ? "muted" : activated ? "active" : "armed";
  return { status, muted, volume, caption, activateForAction, play, startArcade, stopArcade, toggleMuted, setVolume };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
