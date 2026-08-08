"use client";

import Image from "next/image";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArcadeRound, CaseAction } from "@/lib/types";

type Position = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";

function seeded(seed: number) {
  let value = seed || 1;
  return () => {
    value = Math.imul(value ^ (value >>> 15), 1 | value);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function arcadeLayout(seed: number) {
  const random = seeded(seed);
  const forms: Position[] = [];
  while (forms.length < 5) {
    const candidate = { x: 2 + Math.floor(random() * 6), y: Math.floor(random() * 5) };
    if (!forms.some((item) => item.x === candidate.x && item.y === candidate.y)) forms.push(candidate);
  }
  return {
    forms,
    hazards: [
      { x: 3 + Math.floor(random() * 3), y: Math.floor(random() * 5) },
      { x: 6 + Math.floor(random() * 2), y: Math.floor(random() * 5) },
    ],
  };
}

function move(position: Position, direction: Direction) {
  if (direction === "up") return { ...position, y: Math.max(0, position.y - 1) };
  if (direction === "down") return { ...position, y: Math.min(4, position.y + 1) };
  if (direction === "left") return { ...position, x: Math.max(0, position.x - 1) };
  return { ...position, x: Math.min(9, position.x + 1) };
}

function samePosition(a: Position, b: Position) {
  return a.x === b.x && a.y === b.y;
}

export function PaperworkPanic({
  round,
  chaosLevel,
  suspicion,
  believability,
  busy,
  onResolve,
  onStartAudio,
  onStopAudio,
  onPlayCue,
}: {
  round: ArcadeRound;
  chaosLevel: number;
  suspicion: number;
  believability: number;
  busy: boolean;
  onResolve: (action: Extract<CaseAction, { type: "resolve_arcade_round" }>) => void;
  onStartAudio: (level: number) => void;
  onStopAudio: () => void;
  onPlayCue: (cue: "collect" | "hazard" | "arcade_win" | "arcade_fail", level: number) => void;
}) {
  const layout = useMemo(() => arcadeLayout(round.seed), [round.seed]);
  const [position, setPosition] = useState<Position>({ x: 0, y: 2 });
  const [remaining, setRemaining] = useState<number>(round.durationMs);
  const [collectedIds, setCollectedIds] = useState<number[]>([]);
  const [hazardsHit, setHazardsHit] = useState(0);
  const [hazardStep, setHazardStep] = useState(0);
  const resolvedRef = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useRef(false);

  const resolve = useCallback((skipped: boolean) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onStopAudio();
    const delivered = !skipped && collectedIds.length >= round.targetCount && hazardsHit < 3;
    if (!skipped) onPlayCue(delivered ? "arcade_win" : "arcade_fail", chaosLevel);
    onResolve({
      type: "resolve_arcade_round",
      roundId: round.id,
      collected: collectedIds.length,
      hazardsHit,
      skipped,
    });
  }, [chaosLevel, collectedIds.length, hazardsHit, onPlayCue, onResolve, onStopAudio, round.id, round.targetCount]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    skipRef.current?.focus();
    onStartAudio(chaosLevel);
    return () => {
      onStopAudio();
      previousFocus?.focus();
    };
  }, [chaosLevel, onStartAudio, onStopAudio]);

  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(() => {
      const next = Math.max(0, round.durationMs - (performance.now() - started));
      setRemaining(next);
      if (next <= 0) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [round.durationMs]);

  useEffect(() => {
    if (remaining <= 0) resolve(false);
  }, [remaining, resolve]);

  useEffect(() => {
    if (collectedIds.length >= round.targetCount) resolve(false);
  }, [collectedIds.length, resolve, round.targetCount]);

  useEffect(() => {
    if (reducedMotion.current) return;
    const timer = window.setInterval(() => setHazardStep((step) => step + 1), 650);
    return () => window.clearInterval(timer);
  }, []);

  const hazardPositions = layout.hazards.map((hazard, index) => ({
    x: (hazard.x + hazardStep * (index % 2 === 0 ? 1 : -1) + 10) % 10,
    y: hazard.y,
  }));

  const movePigeon = useCallback((direction: Direction) => {
    if (busy || resolvedRef.current) return;
    if (reducedMotion.current) setHazardStep((step) => step + 1);
    setPosition((current) => {
      const next = move(current, direction);
      const formIndex = layout.forms.findIndex((form, index) => !collectedIds.includes(index) && samePosition(form, next));
      if (formIndex >= 0) {
        setCollectedIds((items) => [...items, formIndex]);
        onPlayCue("collect", chaosLevel);
      }
      if (hazardPositions.some((hazard) => samePosition(hazard, next))) {
        setHazardsHit((hits) => Math.min(12, hits + 1));
        onPlayCue("hazard", chaosLevel);
      }
      return next;
    });
  }, [busy, chaosLevel, collectedIds, hazardPositions, layout.forms, onPlayCue]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction: Direction | undefined = event.key === "ArrowUp" || event.key.toLowerCase() === "w"
        ? "up"
        : event.key === "ArrowDown" || event.key.toLowerCase() === "s"
          ? "down"
          : event.key === "ArrowLeft" || event.key.toLowerCase() === "a"
            ? "left"
            : event.key === "ArrowRight" || event.key.toLowerCase() === "d"
              ? "right"
              : undefined;
      if (direction) {
        event.preventDefault();
        movePigeon(direction);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        resolve(true);
      }
      if (event.key === "Tab" && modalRef.current) {
        const focusable = [...modalRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)")];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [movePigeon, resolve]);

  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  return (
    <div className="arcade-backdrop">
      <div ref={modalRef} className="arcade-cabinet" role="dialog" aria-modal="true" aria-labelledby="arcade-title" aria-describedby="arcade-instructions">
        <header className="arcade-marquee">
          <div><span>Emergency office arcade</span><h2 id="arcade-title">Paperwork Panic</h2></div>
          <button ref={skipRef} onClick={() => resolve(true)} aria-label="Skip Paperwork Panic"><X /></button>
        </header>

        <div className="arcade-hud" aria-live="polite">
          <div><span>Time left</span><strong>00:{String(seconds).padStart(2, "0")}</strong></div>
          <div><span>Score</span><strong>{String(Math.max(0, collectedIds.length * 100 - hazardsHit * 25)).padStart(6, "0")}</strong></div>
          <div><span>Target</span><strong>{round.targetCount} forms</strong></div>
        </div>

        <div className="arcade-body">
          <aside className="arcade-vitals">
            <div className="boss-meter"><span>Suspicion boss health</span><div><i style={{ width: `${suspicion}%` }} /></div><strong>{suspicion}%</strong></div>
            <Image className="arcade-portrait" src="/art/y2k/pigeon-flying.webp" width={160} height={160} alt="Emergency Backup Pigeon carrying paperwork" priority />
            <div className="integrity-meter"><span>Paperwork integrity</span><div><i style={{ width: `${believability}%` }} /></div><strong>{believability}%</strong></div>
          </aside>

          <section className="arcade-playfield" aria-label={`Arcade playfield. ${collectedIds.length} of ${round.targetCount} forms collected. ${hazardsHit} hazards hit.`}>
            <div className="arcade-scanlines" aria-hidden="true" />
            <Image className="arcade-portal" src="/art/y2k/aquarium-portal.webp" width={150} height={170} alt="Aquarium paperwork portal" />
            {layout.forms.map((form, index) => !collectedIds.includes(index) && (
              <Image key={index} className="arcade-form" src="/art/y2k/form-404.webp" width={62} height={62} alt="Stamped paperwork collectible" style={{ left: `${form.x * 9.5 + 3}%`, top: `${form.y * 18 + 5}%` }} />
            ))}
            {hazardPositions.map((hazard, index) => (
              <Image key={index} className="arcade-hazard" src="/art/y2k/red-tape.webp" width={150} height={75} alt="Red tape hazard" style={{ left: `${hazard.x * 8.5}%`, top: `${hazard.y * 18 + 6}%` }} />
            ))}
            <Image className="arcade-player" src="/art/y2k/pigeon-flying.webp" width={92} height={92} alt="Emergency Backup Pigeon player" style={{ left: `${position.x * 9.2 + 1}%`, top: `${position.y * 18 + 3}%` }} />
          </section>

          <aside className="arcade-controls" id="arcade-instructions">
            <h3>How to play</h3>
            <p>Collect three forms. Avoid the red tape. Arrow keys and WASD work too.</p>
            <div className="direction-pad" aria-label="Directional controls">
              <button onClick={() => movePigeon("up")} aria-label="Move up"><ArrowUp /></button>
              <button onClick={() => movePigeon("left")} aria-label="Move left"><ArrowLeft /></button>
              <button onClick={() => movePigeon("down")} aria-label="Move down"><ArrowDown /></button>
              <button onClick={() => movePigeon("right")} aria-label="Move right"><ArrowRight /></button>
            </div>
            <div className="mission-status"><span>Mission status</span><strong>{collectedIds.length} / {round.targetCount}</strong><small>{hazardsHit} red-tape collisions</small></div>
          </aside>
        </div>

        <footer className="arcade-footer">
          <span><Volume2 /> Office chaos beep mix</span>
          <button className="skip-arcade" disabled={busy} onClick={() => resolve(true)}>Skip nonsense</button>
          <span>Round #{round.id.split(":").at(-2)}</span>
        </footer>
      </div>
    </div>
  );
}
