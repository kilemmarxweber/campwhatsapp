"use client";

import { useEffect, useState } from "react";

const WORDS = ["Campagnes", "Marketing"] as const;

const HOLD_MS = 2200;
const LETTER_MS = 90;

type Phase = "hold" | "out" | "in";

function wordAt(index: number) {
  return WORDS[((index % WORDS.length) + WORDS.length) % WORDS.length]!;
}

export function useLandingBrandCycle() {
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("hold");
  const [visibleCount, setVisibleCount] = useState(() => WORDS[0]!.length);
  const [reduceMotion, setReduceMotion] = useState(false);

  const word = wordAt(wordIndex);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (wordIndex >= WORDS.length || wordIndex < 0) {
      setWordIndex(0);
      setVisibleCount(WORDS[0]!.length);
      setPhase("hold");
    }
  }, [wordIndex]);

  useEffect(() => {
    if (reduceMotion) {
      const id = window.setInterval(() => {
        setWordIndex((prev) => (prev + 1) % WORDS.length);
      }, HOLD_MS + 800);
      return () => window.clearInterval(id);
    }

    if (phase === "hold") {
      const id = window.setTimeout(() => setPhase("out"), HOLD_MS);
      return () => window.clearTimeout(id);
    }

    if (phase === "out") {
      if (visibleCount <= 0) {
        setWordIndex((prev) => (prev + 1) % WORDS.length);
        setVisibleCount(0);
        setPhase("in");
        return;
      }
      const id = window.setTimeout(
        () => setVisibleCount((n) => Math.max(0, n - 1)),
        LETTER_MS,
      );
      return () => window.clearTimeout(id);
    }

    if (visibleCount >= word.length) {
      setPhase("hold");
      return;
    }
    const id = window.setTimeout(
      () => setVisibleCount((n) => n + 1),
      LETTER_MS,
    );
    return () => window.clearTimeout(id);
  }, [phase, visibleCount, word, reduceMotion]);

  return {
    word,
    visibleCount: reduceMotion ? word.length : visibleCount,
    longest: WORDS.reduce((a, b) => (a.length >= b.length ? a : b)),
  };
}

export function LandingBrandCycle({
  className,
  word,
  visibleCount,
  longest,
}: {
  className?: string;
  word: string;
  visibleCount: number;
  longest: string;
}) {
  return (
    <p className={className} aria-label={word}>
      <span className="landing-brand-cycle">
        <span className="landing-brand-cycle__sizer" aria-hidden>
          {longest}
        </span>
        <span className="landing-brand-cycle__text" aria-hidden>
          {word.split("").map((char, i) => (
            <span
              key={`${word}-${i}`}
              className={`landing-brand-cycle__char${
                i < visibleCount ? " is-on" : ""
              }`}
            >
              {char}
            </span>
          ))}
        </span>
      </span>
    </p>
  );
}
