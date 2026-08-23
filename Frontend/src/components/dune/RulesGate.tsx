"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, ScrollText, ShieldCheck, X } from "lucide-react";
import { FlipText } from "./FlipText";
import { RULE_BOOK, TERMS, type RuleItem } from "../../lib/tournament-rules";
import { brandClass, type BrandKey } from "../../lib/brands";

/** Step 1, shown before the pay popup: the Rule Book (gold theme). The content is identical
 * across brands; `brand` only restyles the card (e.g. VA colours). */
export function RuleBookGate({ onAccept, onCancel, brand }: { onAccept: () => void; onCancel: () => void; brand?: BrandKey }) {
  return (
    <RuleDoc
      variant="rules"
      stepIndex={1}
      brand={brand}
      icon={<ScrollText size={16} />}
      eyebrow={["OFFICIAL RULE BOOK", "공식 룰북"]}
      title={["Tournament Rules", "토너먼트 규정"]}
      items={RULE_BOOK}
      agreeLabel={["I have read and agree to the Rule Book", "룰북을 읽고 동의합니다"]}
      nextLabel={["Next", "다음"]}
      onNext={onAccept}
      onCancel={onCancel}
    />
  );
}

/** Step 2, shown after the pay popup: the Terms & Conditions (cyan/violet theme). Accepting
 * this is the final confirmation and triggers the actual entry-fee payment. */
export function TermsGate({
  onAccept,
  onCancel,
  pending,
  brand,
}: {
  onAccept: () => void;
  onCancel: () => void;
  pending?: boolean;
  brand?: BrandKey;
}) {
  return (
    <RuleDoc
      variant="terms"
      stepIndex={2}
      brand={brand}
      icon={<ShieldCheck size={16} />}
      eyebrow={["TERMS & CONDITIONS", "이용약관"]}
      title={["Terms & Conditions", "이용약관"]}
      items={TERMS}
      agreeLabel={["I have read and agree to the Terms & Conditions", "이용약관을 읽고 동의합니다"]}
      nextLabel={["Agree & Pay", "동의하고 결제"]}
      pendingLabel={["Processing…", "처리 중…"]}
      pending={pending}
      onNext={onAccept}
      onBack={onCancel}
      onCancel={onCancel}
    />
  );
}

function RuleDoc({
  variant,
  stepIndex,
  brand,
  icon,
  eyebrow,
  title,
  items,
  agreeLabel,
  nextLabel,
  pendingLabel,
  pending,
  onNext,
  onBack,
  onCancel,
}: {
  variant: "rules" | "terms";
  stepIndex: 1 | 2;
  brand?: BrandKey;
  icon: React.ReactNode;
  eyebrow: [string, string];
  title: [string, string];
  items: RuleItem[];
  agreeLabel: [string, string];
  nextLabel: [string, string];
  pendingLabel?: [string, string];
  pending?: boolean;
  onNext: () => void;
  onBack?: () => void;
  onCancel: () => void;
}) {
  const [reachedEnd, setReachedEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 12) setReachedEnd(true);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 12) setReachedEnd(true);
  }, []);

  return (
    <div className={`modal-overlay ${brandClass(brand)}`} onClick={onCancel}>
      <div className={`rules-card ${variant} ${brandClass(brand)}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>
        <div className="rules-head">
          <p className="rules-eyebrow">
            {icon}
            <FlipText intervalMs={5000} items={[<>{eyebrow[0]}</>, <>{eyebrow[1]}</>]} />
          </p>
          <div className="rules-steps" aria-hidden="true">
            <i className={stepIndex === 1 ? "on" : ""} />
            <i className={stepIndex === 2 ? "on" : ""} />
          </div>
        </div>
        <h2 className="rules-title">
          <FlipText intervalMs={5000} items={[<>{title[0]}</>, <>{title[1]}</>]} />
        </h2>

        <div className="rules-scroll" ref={scrollRef} onScroll={onScroll}>
          {items.map((it, i) => (
            <div className="rule-item" key={i}>
              <h3>
                <FlipText intervalMs={5000} items={[<>{it.titleEn}</>, <>{it.titleKo}</>]} />
              </h3>
              <p>
                <FlipText intervalMs={5000} items={[<>{it.bodyEn}</>, <>{it.bodyKo}</>]} />
              </p>
            </div>
          ))}
          {!reachedEnd && (
            <p className="rules-scroll-hint">
              <FlipText intervalMs={5000} items={[<>Scroll to the end to continue ↓</>, <>계속하려면 끝까지 스크롤하세요 ↓</>]} />
            </p>
          )}
        </div>

        <div className="rules-foot">
          <label className={`rules-agree ${reachedEnd ? "" : "locked"}`}>
            <input type="checkbox" disabled={!reachedEnd} checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <FlipText intervalMs={5000} items={[<>{agreeLabel[0]}</>, <>{agreeLabel[1]}</>]} />
          </label>
          <div className="rules-actions">
            {onBack && (
              <button className="secondary" onClick={onBack} disabled={pending}>
                <FlipText intervalMs={5000} items={[<>Back</>, <>이전</>]} />
              </button>
            )}
            <button className="primary" disabled={!agreed || pending} onClick={onNext}>
              {pending && pendingLabel ? (
                <FlipText intervalMs={5000} items={[<>{pendingLabel[0]}</>, <>{pendingLabel[1]}</>]} />
              ) : (
                <>
                  <FlipText intervalMs={5000} items={[<>{nextLabel[0]}</>, <>{nextLabel[1]}</>]} />
                  <ChevronRight size={17} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
