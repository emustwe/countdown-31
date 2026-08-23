"use client";

import { useCallback } from "react";
import { soundManager } from "../lib/soundManager";

export function useGameSound() {
  const playClick = useCallback(() => {
    soundManager.playClick();
  }, []);

  const playStep = useCallback((currentCount: number = 1, amount: 1 | 2 = 1) => {
    soundManager.playStep(currentCount, amount);
  }, []);

  const playDanger = useCallback(() => {
    soundManager.playDanger();
  }, []);

  const playSpinDefeat = useCallback(() => {
    soundManager.playSpinDefeat();
  }, []);

  const playVictory = useCallback(() => {
    soundManager.playVictory();
  }, []);

  const playMoo = useCallback(() => {
    soundManager.playMoo();
  }, []);

  const toggleMute = useCallback(() => {
    return soundManager.toggleMute();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    soundManager.setMuted(muted);
  }, []);

  return {
    playClick,
    playStep,
    playDanger,
    playSpinDefeat,
    playVictory,
    playMoo,
    toggleMute,
    setMuted,
    isMuted: soundManager.getMuted(),
  };
}
