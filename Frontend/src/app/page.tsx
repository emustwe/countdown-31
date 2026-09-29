"use client";

import { useRouter } from "next/navigation";
import { EntryGate } from "../components/dune/EntryGate";

/**
 * "/" is the entry screen — one button, portrait-native.
 *
 * The lobby (and everything after it) is landscape and sits behind a "turn your phone" gate, so
 * meeting that wall at the front door is a poor first impression. This screen is comfortable the way
 * a phone is normally held, and it carries the one tap a browser will accept as permission to enter
 * fullscreen. See EntryGate.
 */
export default function EntryPage() {
  const router = useRouter();
  return <EntryGate onNext={() => router.push("/lobby")} />;
}
