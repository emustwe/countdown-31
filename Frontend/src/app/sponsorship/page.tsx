"use client";

import { useState } from "react";
import { CheckCircle2, Gift, Handshake, Mail, Ticket, Trophy, Users, X } from "lucide-react";
import { PageShell, OrbIcon } from "../../components/dune/Shell";
import { useSponsorshipOpportunities, useCreateInquiry, type PromoTournament } from "../../lib/hooks/useSponsors";
import { useProfile } from "../../lib/hooks/useAuth";

type ContactState = { type: "SPONSORSHIP" | "ENTRY"; tournamentId?: string; title?: string; ref?: string } | null;

// A short, human-friendly reference for a tournament, shown so people can quote it in messages.
const refOf = (id: string) => "#" + id.slice(0, 6).toUpperCase();

// Public sponsorship hub: shows private tournaments an admin has opened for sponsorship, lets
// visitors offer to sponsor one (message + email → admin), and lets anyone request entry to a
// tournament (→ admin, and the assigned sponsor if there is one).
export default function SponsorshipPage() {
  const { data: opportunities } = useSponsorshipOpportunities();
  const [contact, setContact] = useState<ContactState>(null);

  const list = opportunities ?? [];

  return (
    <PageShell>
      <main className="page-main sponsorship-main">
        <section className="page-banner">
          <div>
            <h1>Sponsorship</h1>
            <p>Sponsor a tournament, or request entry to one. Tell us how to reach you and we&apos;ll take it from there.</p>
          </div>
        </section>

        {/* Two primary calls to action */}
        <div className="sponsor-cta-row">
          <button className="sponsor-cta glass" onClick={() => setContact({ type: "SPONSORSHIP" })}>
            <span className="sponsor-cta-ico"><Handshake size={22} /></span>
            <b>Become a sponsor</b>
            <small>Back a tournament and get it co-branded to you.</small>
          </button>
          <button className="sponsor-cta glass" onClick={() => setContact({ type: "ENTRY" })}>
            <span className="sponsor-cta-ico"><Ticket size={22} /></span>
            <b>Request tournament entry</b>
            <small>Ask an admin for access to a private tournament.</small>
          </button>
        </div>

        {/* Opportunities */}
        <div className="section-heading" style={{ marginTop: 26 }}>
          <div>
            <p className="eyebrow">OPEN FOR SPONSORSHIP</p>
            <h2>Opportunities</h2>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="placeholder-card" style={{ margin: "10px auto 40px" }}>
            <span className="placeholder-icon"><Trophy size={30} /></span>
            <h1>No open opportunities</h1>
            <p>There are no tournaments seeking a sponsor right now. Check back soon.</p>
          </div>
        ) : (
          <div className="events-grid">
            {list.map((t) => (
              <OpportunityCard key={t.id} t={t} onSponsor={() => setContact({ type: "SPONSORSHIP", tournamentId: t.id, title: t.title, ref: refOf(t.id) })} />
            ))}
          </div>
        )}
      </main>

      {contact && <ContactModal state={contact} onClose={() => setContact(null)} />}
    </PageShell>
  );
}

function OpportunityCard({ t, onSponsor }: { t: PromoTournament; onSponsor: () => void }) {
  const players = t.minPlayers != null || t.maxPlayers != null ? `${t.minPlayers ?? "?"}–${t.maxPlayers ?? "?"} players` : "Player count TBD";
  return (
    <div className="event-card glass">
      <span className="event-card-ico"><Trophy size={22} /></span>
      <span className="event-sponsor">Ref {refOf(t.id)}</span>
      <h3>{t.title}</h3>
      <p>{t.description || "A private tournament looking for a sponsor."}</p>
      <div className="event-facts">
        <span><Users size={13} /> {players}</span>
        {t.prizePool && <span><Gift size={13} /> {t.prizePool}</span>}
      </div>
      <button className="primary full" onClick={onSponsor}>
        <Handshake size={16} /> Offer to sponsor
      </button>
    </div>
  );
}

function ContactModal({ state, onClose }: { state: NonNullable<ContactState>; onClose: () => void }) {
  const { data: profile } = useProfile();
  const send = useCreateInquiry();
  const [email, setEmail] = useState(profile?.email ?? "");
  const [name, setName] = useState(profile?.fullName ?? "");
  const [message, setMessage] = useState("");
  const [tournamentRef, setTournamentRef] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isSponsor = state.type === "SPONSORSHIP";
  const heading = isSponsor ? "Offer to sponsor" : "Request tournament entry";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/.+@.+\..+/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    if (!isSponsor && !tournamentRef.trim()) {
      setError("Please enter the tournament name or reference you want to join.");
      return;
    }
    try {
      await send.mutateAsync({
        type: state.type,
        tournamentId: state.tournamentId,
        tournamentRef: isSponsor ? state.ref : tournamentRef.trim(),
        email: email.trim(),
        name: name.trim(),
        message: message.trim(),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        {done ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <OrbIcon><CheckCircle2 size={26} /></OrbIcon>
            <h2 style={{ marginTop: 12 }}>Message sent</h2>
            <p className="muted">Thanks — an admin will reach out to you by email.</p>
            <button className="primary full" style={{ marginTop: 16 }} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>{heading}</h2>
            {state.title && (
              <p className="muted" style={{ marginTop: -4 }}>
                For: <b>{state.title}</b>{state.ref && <> · Ref <code style={{ color: "var(--gold2)" }}>{state.ref}</code></>}
              </p>
            )}
            <p className="muted" style={{ fontSize: 13 }}>
              {isSponsor
                ? state.tournamentId
                  ? "You're offering to sponsor this specific tournament. Leave your email and a note — an admin will contact you and, if it's a fit, set you up as its sponsor."
                  : "General sponsorship enquiry. Leave your email and a note — an admin will contact you to discuss sponsoring or creating a tournament."
                : "Tell us which tournament you want to join and how to reach you. An admin will check eligibility and send you a referral code."}
            </p>
            <form onSubmit={submit} className="promo-form-grid">
              {!isSponsor && (
                <label className="pf-full">
                  <span>Tournament name or reference</span>
                  <input value={tournamentRef} onChange={(e) => setTournamentRef(e.target.value)} placeholder="e.g. VIP Private Cup or #A1B2C3" />
                </label>
              )}
              <label className="pf-full">
                <span>Your name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
              </label>
              <label className="pf-full">
                <span>Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </label>
              <label className="pf-full">
                <span>Message</span>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder={isSponsor ? "Tell us about your brand…" : "Which tournament, and anything else we should know…"} />
              </label>
              {error && <div className="pf-full sponsor-auth-err">{error}</div>}
              <div className="pf-full pf-actions">
                <button className="primary" type="submit" disabled={send.isPending}>
                  <Mail size={15} /> {send.isPending ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
