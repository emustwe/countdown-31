"use client";

import React from "react";
import { motion } from "framer-motion";
import { CowEmotion } from "../../stores/game-store";

interface CowAvatarProps {
  name: string;
  emotion: CowEmotion;
  isCurrentTurn: boolean;
  themeColor?: string;
  spotColor?: string;
  size?: number;
  isLoser?: boolean;
  isWinner?: boolean;
}

export function CowAvatar({
  name,
  emotion,
  isCurrentTurn,
  themeColor = "#4ade80",
  spotColor = "#1e293b",
  size = 130,
  isLoser = false,
  isWinner = false,
}: CowAvatarProps) {
  const isDizzy = emotion === "dizzy" || isLoser;
  const isSweating = emotion === "sweating";
  const isCelebrating = emotion === "celebrating" || isWinner;

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Turn indicator glow halo */}
      {isCurrentTurn && !isDizzy && (
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-3 rounded-full blur-md"
          style={{ backgroundColor: `${themeColor}66` }}
        />
      )}

      {/* Outer wrapper with dizzy spin or bounce motion */}
      <motion.div
        animate={
          isDizzy
            ? {
                rotate: [0, 360, 720, 1080, 1440],
                scale: [1, 1.15, 0.9, 1.1, 0.85],
                y: [0, -20, 10, -10, 5],
              }
            : isCelebrating
              ? {
                  y: [0, -14, 0, -14, 0],
                  rotate: [0, -4, 4, -4, 0],
                  scale: [1, 1.08, 1, 1.08, 1],
                }
              : isSweating
                ? {
                    x: [-2, 2, -2, 2, 0],
                    y: [0, 1, -1, 1, 0],
                  }
                : isCurrentTurn
                  ? {
                      y: [0, -6, 0],
                    }
                  : { y: 0 }
        }
        transition={
          isDizzy
            ? { duration: 2.2, ease: [0.25, 1, 0.5, 1] }
            : isCelebrating
              ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
              : isSweating
                ? { duration: 0.25, repeat: Infinity }
                : isCurrentTurn
                  ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.3 }
        }
        className="relative z-10"
        style={{ width: size, height: size }}
      >
        {/* Dizzy stars circling above head when 31 is hit */}
        {isDizzy && (
          <div className="absolute -top-6 inset-x-0 flex justify-center items-center gap-1 z-30 pointer-events-none">
            <motion.span
              animate={{ rotate: 360, scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="text-2xl drop-shadow"
            >
              💫
            </motion.span>
            <motion.span
              animate={{ rotate: -360, scale: [1.2, 0.7, 1.2] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="text-xl drop-shadow"
            >
              ⭐
            </motion.span>
            <motion.span
              animate={{ rotate: 360, scale: [0.9, 1.4, 0.9] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              className="text-2xl drop-shadow"
            >
              💫
            </motion.span>
          </div>
        )}

        {/* Winner crown */}
        {isCelebrating && (
          <motion.div
            animate={{ y: [-4, 2, -4], rotate: [-5, 5, -5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-7 inset-x-0 flex justify-center text-3xl z-30 pointer-events-none drop-shadow-md"
          >
            👑
          </motion.div>
        )}

        {/* Sweat drops when sweating */}
        {isSweating && (
          <motion.div
            animate={{ y: [-3, 8], opacity: [1, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, ease: "easeIn" }}
            className="absolute top-4 right-1 text-xl z-30 pointer-events-none drop-shadow"
          >
            💦
          </motion.div>
        )}

        {/* Stylized Cow SVG Graphic */}
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full drop-shadow-xl"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cow Ears */}
          <ellipse cx="28" cy="56" rx="18" ry="10" transform="rotate(-25 28 56)" fill="#f472b6" stroke="#451a03" strokeWidth="4" />
          <ellipse cx="132" cy="56" rx="18" ry="10" transform="rotate(25 132 56)" fill="#f472b6" stroke="#451a03" strokeWidth="4" />

          {/* Cow Horns */}
          <path d="M 44 48 Q 30 18 52 24 Q 48 38 48 48 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="3.5" />
          <path d="M 116 48 Q 130 18 108 24 Q 112 38 112 48 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="3.5" />

          {/* Main Cow Head / Body */}
          <rect
            x="32"
            y="36"
            width="96"
            height="90"
            rx="36"
            fill="#ffffff"
            stroke="#3b2010"
            strokeWidth="5"
          />

          {/* Head Spots */}
          <path
            d="M 40 40 Q 64 36 68 56 Q 52 68 36 60 Z"
            fill={spotColor}
            opacity="0.88"
          />
          <circle cx="112" cy="54" r="14" fill={spotColor} opacity="0.88" />
          <path
            d="M 98 100 Q 118 90 124 112 Q 106 122 98 100 Z"
            fill={spotColor}
            opacity="0.88"
          />

          {/* Cheerful Cow Eyes */}
          {isDizzy ? (
            // Dizzy Spiral Eyes
            <g stroke="#3b2010" strokeWidth="3.5" fill="none" strokeLinecap="round">
              <path d="M 52 66 A 7 7 0 1 0 66 66 A 4 4 0 1 0 58 66" />
              <path d="M 94 66 A 7 7 0 1 0 108 66 A 4 4 0 1 0 100 66" />
            </g>
          ) : isSweating ? (
            // Nervous wide eyes with trembling pupils
            <g>
              <ellipse cx="58" cy="65" rx="9" ry="11" fill="#ffffff" stroke="#3b2010" strokeWidth="3.5" />
              <ellipse cx="102" cy="65" rx="9" ry="11" fill="#ffffff" stroke="#3b2010" strokeWidth="3.5" />
              <circle cx="59" cy="67" r="4.5" fill="#1e293b" />
              <circle cx="103" cy="67" r="4.5" fill="#1e293b" />
              {/* Worried brows */}
              <path d="M 48 50 Q 58 56 68 52" stroke="#3b2010" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M 92 52 Q 102 56 112 50" stroke="#3b2010" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </g>
          ) : isCelebrating ? (
            // Happy closed curved eyes (^_^)
            <g stroke="#3b2010" strokeWidth="4" fill="none" strokeLinecap="round">
              <path d="M 50 68 Q 58 56 66 68" />
              <path d="M 94 68 Q 102 56 110 68" />
            </g>
          ) : (
            // Big confident shiny cartoon eyes
            <g>
              <circle cx="58" cy="65" r="9" fill="#1e293b" />
              <circle cx="55" cy="62" r="3.5" fill="#ffffff" />
              <circle cx="102" cy="65" r="9" fill="#1e293b" />
              <circle cx="99" cy="62" r="3.5" fill="#ffffff" />
              {/* Confident brows */}
              <path d="M 50 52 Q 58 48 66 52" stroke="#3b2010" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M 94 52 Q 102 48 110 52" stroke="#3b2010" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </g>
          )}

          {/* Cow Muzzle / Snout */}
          <ellipse
            cx="80"
            cy="98"
            rx="34"
            ry="22"
            fill="#fbcfe8"
            stroke="#3b2010"
            strokeWidth="4"
          />

          {/* Nostrils */}
          <ellipse cx="68" cy="96" rx="5" ry="6" fill="#831843" />
          <ellipse cx="92" cy="96" rx="5" ry="6" fill="#831843" />

          {/* Mouth */}
          {isDizzy ? (
            // Wavy dizzy tongue out
            <path
              d="M 70 108 Q 80 118 90 108"
              stroke="#831843"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />
          ) : isCelebrating ? (
            // Big happy open grin
            <path
              d="M 66 104 Q 80 120 94 104 Z"
              fill="#ef4444"
              stroke="#831843"
              strokeWidth="2.5"
            />
          ) : isSweating ? (
            // Wobbly nervous mouth
            <path
              d="M 68 108 Q 74 105 80 108 Q 86 111 92 108"
              stroke="#831843"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            // Gentle confident smile
            <path
              d="M 72 106 Q 80 114 88 106"
              stroke="#831843"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Bell around neck */}
          <g>
            <rect x="58" y="122" width="44" height="8" rx="4" fill="#ef4444" stroke="#3b2010" strokeWidth="2.5" />
            <circle cx="80" cy="134" r="8" fill="#fbbf24" stroke="#78350f" strokeWidth="2.5" />
            <circle cx="80" cy="136" r="2.5" fill="#78350f" />
          </g>
        </svg>
      </motion.div>

      {/* Name badge */}
      <div
        className={`mt-2 px-3 py-1 rounded-full font-title text-sm font-bold border-2 transition-all shadow-sm ${
          isCurrentTurn
            ? "bg-amber-400 text-amber-950 border-amber-950 scale-105 shadow-md ring-2 ring-amber-300"
            : "bg-white/90 text-amber-950 border-amber-900/30"
        }`}
      >
        {name}
      </div>
    </div>
  );
}
