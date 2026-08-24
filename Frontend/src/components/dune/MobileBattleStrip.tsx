"use client";

import { Crown, Moon, Plus, RotateCcw, Shield, Sparkles, Zap } from "lucide-react";
import { MasterAvatar } from "./MasterAvatar";
import { useAvatarStore, type AvatarConfig } from "../../stores/avatar-customization-store";
import type { GameMode, LivePlayer, SkillType } from "../../lib/hooks/useCountdownLive";
import { useGameConfig } from "../../lib/hooks/useGameConfig";
import { soundManager } from "../../lib/soundManager";

const SKILLS: Record<SkillType, { short: string; icon: typeof Zap }> = {
  rewind: { short: "Back 2", icon: RotateCcw },
  turbo: { short: "Leap 3", icon: Zap },
  shield: { short: "Shield", icon: Shield },
  nudge: { short: "Skip", icon: Moon },
  double: { short: "Force 2", icon: Sparkles },
};

export function MobileBattleStrip({
  myPlayer,
  opponentPlayer,
  allPlayers,
  currentId,
  myTurn,
  gameMode,
  onJoin,
  onSkill,
  skillsLocked,
}: {
  myPlayer: LivePlayer | null;
  opponentPlayer: LivePlayer | null;
  allPlayers: LivePlayer[];
  currentId: string | null;
  myTurn: boolean;
  gameMode: GameMode;
  onJoin: () => void;
  onSkill: (skill: SkillType) => void;
  skillsLocked: boolean;
}) {
  const avatar = useAvatarStore();
  const { data: gameConfig } = useGameConfig();
  const activeOpponent = allPlayers.find((player) => player.id === currentId && player.id !== myPlayer?.id) ?? opponentPlayer;
  const configuredBot = gameConfig?.bots.find(
    (bot) => `cpu_${bot.id}` === activeOpponent?.id || bot.name === activeOpponent?.name,
  );
  const localConfig = {
    ...avatar,
    ...(myPlayer?.avatar ?? {}),
    backgroundId: "none",
    frameId: "none",
  } as AvatarConfig;
  const opponentConfig = {
    ...avatar,
    variantId: (activeOpponent?.avatar?.variantId ?? configuredBot?.avatarVariantId ?? "daisy_v1_cowboy") as AvatarConfig["variantId"],
    backgroundId: "none",
    frameId: "none",
  } as AvatarConfig;
  const localSkills = myPlayer?.equippedSkills?.length ? myPlayer.equippedSkills : (["rewind", "turbo"] as SkillType[]);
  const rivalSkills = activeOpponent?.equippedSkills?.length ? activeOpponent.equippedSkills : (["shield", "nudge"] as SkillType[]);

  return (
    <div className="mobile-battle-strip">
      <PlayerPod
        side="you"
        name={myPlayer?.name ?? "Your cow"}
        turn={myTurn}
        avatar={myPlayer ? localConfig : null}
        onJoin={onJoin}
      />

      <div className="mobile-versus" aria-label="Versus">VS</div>

      <PlayerPod
        side="rival"
        name={activeOpponent?.name ?? "Daisy Cow"}
        turn={!myTurn && !!currentId}
        avatar={opponentConfig}
      />

      {gameMode === "skills" && (
        <div className="mobile-skill-rail is-local" aria-label="Your skills">
          {localSkills.slice(0, 2).map((skill) => {
            const meta = SKILLS[skill];
            const Icon = meta.icon;
            const uses = myPlayer?.skills?.[skill] ?? 0;
            const disabled = !myPlayer || !myTurn || skillsLocked || uses <= 0;
            return (
              <button
                type="button"
                key={skill}
                disabled={disabled}
                onClick={() => {
                  soundManager.playSkillCast();
                  onSkill(skill);
                }}
                aria-label={`Use ${meta.short}`}
              >
                <Icon size={15} />
                <span>{meta.short}</span>
                <small>{uses}×</small>
              </button>
            );
          })}
        </div>
      )}

      {gameMode === "skills" && (
        <div className="mobile-skill-rail is-rival" aria-label="Opponent skills">
          {rivalSkills.slice(0, 2).map((skill) => {
            const meta = SKILLS[skill];
            const Icon = meta.icon;
            return (
              <div key={skill}>
                <Icon size={14} />
                <span>{meta.short}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayerPod({
  side,
  name,
  turn,
  avatar,
  onJoin,
}: {
  side: "you" | "rival";
  name: string;
  turn: boolean;
  avatar: AvatarConfig | null;
  onJoin?: () => void;
}) {
  const content = (
    <>
      <span className="mobile-pod-label">
        {side === "you" ? <Crown size={11} /> : <Sparkles size={11} />}
        {turn ? "Your turn" : side === "you" ? "You" : "Rival"}
      </span>
      <span className="mobile-pod-avatar">
        {avatar ? <MasterAvatar config={avatar} /> : <Plus size={30} />}
      </span>
      <strong>{avatar ? name : "Tap to join"}</strong>
    </>
  );

  return onJoin && !avatar ? (
    <button type="button" className={`mobile-player-pod is-${side}`} onClick={onJoin}>
      {content}
    </button>
  ) : (
    <div className={`mobile-player-pod is-${side} ${turn ? "is-turn" : ""}`}>{content}</div>
  );
}
