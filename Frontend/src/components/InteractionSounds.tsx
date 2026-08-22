"use client";

import { useEffect } from "react";
import { useSettingsStore } from "../stores/settings-store";
import { soundManager } from "../lib/soundManager";

type SoundIntent =
  | "click"
  | "close"
  | "confirm"
  | "copy"
  | "equip"
  | "error"
  | "navigate"
  | "open"
  | "purchase"
  | "select"
  | "skill"
  | "success"
  | "toggle";

function intentFrom(element: HTMLElement): SoundIntent {
  const requested = element.dataset.sound as SoundIntent | undefined;
  if (requested) return requested;

  const label = `${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("title") ?? ""} ${element.textContent ?? ""}`.toLowerCase();
  const tag = element.tagName.toLowerCase();

  if (element.getAttribute("aria-haspopup") || element.hasAttribute("aria-expanded")) return "open";
  if (/close|cancel|dismiss|back/.test(label)) return "close";
  if (/copy|clipboard/.test(label)) return "copy";
  if (/buy|unlock|purchase/.test(label)) return "purchase";
  if (/equip|wear|use skill|cast/.test(label)) return /skill|cast/.test(label) ? "skill" : "equip";
  if (/save|confirm|submit|join|enter|create|sign in|log in|play now|play again/.test(label)) return "confirm";
  if (tag === "a" || /home|profile|wallet|shop|tournament|settings|history|sponsor/.test(label)) return "navigate";
  if (/menu|rules|sound|profile menu|show|hide/.test(label)) return "open";
  return "click";
}

function playIntent(intent: SoundIntent, element?: HTMLElement) {
  switch (intent) {
    case "close": soundManager.playClose(); break;
    case "confirm": soundManager.playConfirm(); break;
    case "copy": soundManager.playCopy(); break;
    case "equip": soundManager.playEquip(); break;
    case "error": soundManager.playError(); break;
    case "navigate": soundManager.playNavigate(); break;
    case "open": soundManager.playOpen(); break;
    case "purchase": soundManager.playCoin(); break;
    case "select": soundManager.playCardSelect(); break;
    case "skill": soundManager.playSkillCast(); break;
    case "success": soundManager.playSuccess(); break;
    case "toggle": {
      const pressed = element?.getAttribute("aria-pressed") === "true";
      const checked = element instanceof HTMLInputElement ? element.checked : pressed;
      soundManager.playToggle(checked);
      break;
    }
    default: soundManager.playClick();
  }
}

/**
 * Gives every standard control a restrained sound without requiring every page
 * to import SoundManager. Component-specific game sounds win: the short delay
 * detects them and avoids playing a second generic click on top.
 */
export function InteractionSounds() {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);

  useEffect(() => {
    soundManager.setMuted(!soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function interactiveTarget(target: EventTarget | null) {
      if (!(target instanceof Element)) return null;
      return target.closest<HTMLElement>("button, a, summary, [role='button'], [role='tab']");
    }

    function onPointerOver(event: PointerEvent) {
      if (!canHover) return;
      const element = interactiveTarget(event.target);
      if (!element || element.dataset.sound === "none" || element.matches(":disabled, [aria-disabled='true']")) return;
      if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
      soundManager.playHover();
    }

    function unlockAudio() {
      soundManager.unlock();
    }

    function onClick(event: MouseEvent) {
      const element = interactiveTarget(event.target);
      if (!element || element.dataset.sound === "none" || element.matches(":disabled, [aria-disabled='true']")) return;
      const recentComponentSound = Date.now() - 60;
      window.setTimeout(() => {
        if (!soundManager.wasPlayedSince(recentComponentSound)) playIntent(intentFrom(element), element);
      }, 0);
    }

    function onChange(event: Event) {
      if (!(event.target instanceof HTMLElement) || event.target.dataset.sound === "none") return;
      if (event.target instanceof HTMLInputElement && ["checkbox", "radio"].includes(event.target.type)) {
        playIntent("toggle", event.target);
      } else if (event.target instanceof HTMLSelectElement || event.target.getAttribute("role") === "slider") {
        playIntent("select", event.target);
      }
    }

    const announced = new WeakSet<Node>();
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        const candidates = [record.target, ...Array.from(record.addedNodes)];
        candidates.forEach((node) => {
          if (!(node instanceof HTMLElement) || announced.has(node)) return;
          const alert = node.matches("[role='alert'], .toast-notification")
            ? node
            : node.querySelector<HTMLElement>("[role='alert'], .toast-notification");
          if (!alert || !alert.textContent?.trim() || announced.has(alert)) return;
          announced.add(alert);
          playIntent(alert.matches(".toast-notification, [data-success]") ? "success" : "error");
        });
      });
    });

    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerdown", unlockAudio, { passive: true });
    document.addEventListener("keydown", unlockAudio, { once: true });
    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
      document.removeEventListener("click", onClick);
      document.removeEventListener("change", onChange);
      observer.disconnect();
    };
  }, []);

  return null;
}
