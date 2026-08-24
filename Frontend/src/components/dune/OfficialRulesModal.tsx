"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, ShieldAlert, Zap, Trophy, ShieldCheck, Search } from "lucide-react";
import { soundManager } from "../../lib/soundManager";

interface OfficialRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RuleItem {
  number: number;
  title: string;
  category: "Core" | "Moves" | "Skills" | "Fair Play";
  description: string;
  highlight?: boolean;
}

const RULES: RuleItem[] = [
  { number: 1, title: "Stay Alive", category: "Core", description: "Your objective is simple: Be the last player remaining." },
  { number: 2, title: "Follow the Turn Order", category: "Core", description: "Play only when it is your turn. The server controls the player order throughout the tournament." },
  { number: 3, title: "Every Round Starts at 1", category: "Core", description: "Every new round always begins with Number 1." },
  { number: 4, title: "Continue the Count", category: "Core", description: "You must always begin with the next available number." },
  { number: 5, title: "Choose Your Count (+1, +2, +3)", category: "Moves", description: "On your turn you may announce 1 Number, 2 Numbers, or 3 Numbers. No more.", highlight: true },
  { number: 6, title: "Don’t Repeat Previous Digit Count", category: "Moves", description: "You cannot use the same Digit Count as the player immediately before you. Repeating the previous Digit Count results in immediate elimination.", highlight: true },
  { number: 7, title: "Keep Numbers Consecutive", category: "Moves", description: "Numbers must always be consecutive. Skipping numbers is not allowed." },
  { number: 8, title: "Think Fast (5s Timer)", category: "Moves", description: "You have 5 seconds to complete your turn. Time runs out… You’re out.", highlight: true },
  { number: 9, title: "Never Say 31", category: "Core", description: "If you announce 31… You’re Eliminated.", highlight: true },
  { number: 10, title: "New Round", category: "Core", description: "After someone is eliminated by saying 31, the round immediately restarts from 1." },
  { number: 11, title: "Stay in the Tournament", category: "Core", description: "Only surviving players continue into the next round." },
  { number: 12, title: "Last Player Wins", category: "Core", description: "When only one player remains, the tournament ends. Champion." },
  { number: 13, title: "Pick Your Skills", category: "Skills", description: "Choose 2 Skills before the tournament starts. Choose wisely. You can purchase skills in the shop." },
  { number: 14, title: "One Use Only", category: "Skills", description: "Each Skill may only be used once per tournament. Once it’s gone… It’s gone." },
  { number: 15, title: "Skills Work Only Until 21", category: "Skills", description: "Skills can only be activated while the current number is between 1 and 21.", highlight: true },
  { number: 16, title: "Skill Lock at 22", category: "Skills", description: "Once the count reaches 22, all Skills become locked. No exceptions.", highlight: true },
  { number: 17, title: "New Round Unlock", category: "Skills", description: "When the count returns to 1, unused Skills become available again. Used Skills never return." },
  { number: 18, title: "Your Turn, Your Skill", category: "Skills", description: "Skills may only be activated during your own turn." },
  { number: 19, title: "Play Fair", category: "Fair Play", description: "No Bots. No Scripts. No Macros. No Exploits. No Cheating." },
  { number: 20, title: "One Account Only", category: "Fair Play", description: "One player. One account. Multiple accounts are prohibited." },
  { number: 21, title: "Disconnects", category: "Fair Play", description: "If you fail to reconnect before the reconnect timer expires, you are eliminated." },
  { number: 22, title: "Spectator Mode", category: "Fair Play", description: "Once eliminated, you become a spectator. Watch. Cheer. Enjoy." },
  { number: 23, title: "Server Is Always Right", category: "Fair Play", description: "All gameplay is validated by the official game server. Server decisions are final." },
  { number: 24, title: "Respect Everyone", category: "Fair Play", description: "Treat every player with respect. Harassment, abuse, or toxic behavior will not be tolerated." },
  { number: 25, title: "No Match Fixing", category: "Fair Play", description: "Collusion, intentional losing, or manipulating results is strictly prohibited." },
  { number: 26, title: "Tournament Rankings", category: "Fair Play", description: "Final rankings are determined by elimination order." },
  { number: 27, title: "Prize Distribution", category: "Fair Play", description: "Prizes are awarded according to the official tournament announcement." },
  { number: 28, title: "Rule Updates", category: "Fair Play", description: "Rules may be updated before future tournaments to improve fairness and gameplay." },
  { number: 29, title: "Official Decisions", category: "Fair Play", description: "The Organizer has the final authority on all tournament decisions." },
  { number: 30, title: "Have Fun", category: "Fair Play", description: "Compete hard. Play fair. Respect others. Enjoy every round." },
  { number: 31, title: "Player Agreement", category: "Fair Play", description: "By entering this tournament, you confirm that you have read, understood, and accepted all Official Rules." },
];

export function OfficialRulesModal({ isOpen, onClose }: OfficialRulesModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const categories = ["All", "Core", "Moves", "Skills", "Fair Play"];

  const filteredRules = RULES.filter((r) => {
    const matchesCat = activeCategory === "All" || r.category === activeCategory;
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `Rule #${r.number}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-gradient-to-b from-[#14231b] via-[#0b1611] to-[#050b08] border-2 border-amber-400/70 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.4)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/30 bg-black/40">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="font-title font-black text-xl sm:text-2xl text-amber-300 tracking-wide">
                  OFFICIAL GAME RULES
                </h2>
                <span className="text-[11px] font-title font-semibold text-emerald-300/80 uppercase tracking-widest">
                  Count Down 31 Tournament Code
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="w-9 h-9 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 hover:text-white hover:bg-black/80 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="px-6 py-3 border-b border-amber-500/20 bg-black/20 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    soundManager.playClick();
                    setActiveCategory(cat);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-title font-bold transition-all cursor-pointer ${
                    activeCategory === cat
                      ? "bg-amber-400 text-amber-950 shadow-[0_0_12px_rgba(255,215,0,0.6)]"
                      : "bg-slate-900/80 text-amber-200/70 hover:text-white border border-amber-500/20"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400/60" />
              <input
                type="text"
                placeholder="Search rule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/50 border border-amber-500/30 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Rules List Container */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
            {filteredRules.map((rule) => (
              <div
                key={rule.number}
                className={`p-3.5 rounded-2xl border transition-all ${
                  rule.highlight
                    ? "bg-gradient-to-r from-amber-950/40 via-emerald-950/30 to-amber-950/40 border-amber-400/60 shadow-[0_4px_16px_rgba(245,158,11,0.15)]"
                    : "bg-black/30 border-amber-500/20 hover:border-amber-500/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-title font-black text-xs px-2 py-0.5 rounded-md bg-amber-400 text-amber-950 shadow">
                      Rule #{rule.number}
                    </span>
                    <h3 className="font-title font-black text-sm sm:text-base text-white">
                      {rule.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-title font-bold text-amber-300/70 uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {rule.category}
                  </span>
                </div>
                <p className="font-ui text-xs sm:text-sm text-amber-100/90 leading-relaxed font-semibold">
                  {rule.description}
                </p>
              </div>
            ))}

            {filteredRules.length === 0 && (
              <div className="text-center py-8 text-amber-200/60 font-title">
                No rules found matching &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>

          {/* Footer Close Button */}
          <div className="px-6 py-3 border-t border-amber-500/30 bg-black/40 flex justify-end">
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="btn-arcade-3d btn-arcade-green text-xs sm:text-sm py-2 px-6 rounded-xl cursor-pointer"
            >
              UNDERSTOOD
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
