export const participationPolicyId = 'ranked-participation-v1';

export type Participation = {
  eligibleRaids: number;
  servedRaids: number;
  everExecuted: boolean;
  firstEligibleSeq: number | null;
  lastServedSeq: number | null;
};

export type ParticipationLedger = {
  history: Map<string, Participation>;
  windowSeq: number;
  settlementSeq: number;
};

export type ParticipationCommit = {
  changes: ReadonlyMap<string, Participation>;
  window?: { id: string; sequence: number; raidId: string };
  settlement?: { raidId: string; sequence: number; stage: number; at: number };
};

export function applyParticipationCommit(ledger: ParticipationLedger, commit: ParticipationCommit) {
  for (const [id, stats] of commit.changes) ledger.history.set(id, stats);
  if (commit.window) ledger.windowSeq = commit.window.sequence;
  if (commit.settlement) ledger.settlementSeq = commit.settlement.sequence;
}

const empty: Readonly<Participation> = {
  eligibleRaids: 0, servedRaids: 0, everExecuted: false,
  firstEligibleSeq: null, lastServedSeq: null,
};

type Candidate = { playerId: string; tie: string };
const ascending = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

export function participationOrder(history: ReadonlyMap<string, Participation>, nextWindowSeq: number) {
  return (a: Candidate, b: Candidate) => {
    const left = history.get(a.playerId) ?? empty;
    const right = history.get(b.playerId) ?? empty;
    if (left.everExecuted !== right.everExecuted) return left.everExecuted ? 1 : -1;
    if (!left.everExecuted) {
      const age = (left.firstEligibleSeq ?? nextWindowSeq) - (right.firstEligibleSeq ?? nextWindowSeq);
      if (age) return age;
    } else {
      // Compare (served + 1) / (eligible + 4) without floating-point ties.
      const ratio = (BigInt(left.servedRaids) + 1n) * (BigInt(right.eligibleRaids) + 4n)
        - (BigInt(right.servedRaids) + 1n) * (BigInt(left.eligibleRaids) + 4n);
      if (ratio !== 0n) return ratio < 0n ? -1 : 1;
      const last = (left.lastServedSeq ?? 0) - (right.lastServedSeq ?? 0);
      if (last) return last;
    }
    return ascending(a.tie, b.tie) || ascending(a.playerId, b.playerId);
  };
}

export function recordParticipationWindow(
  history: ReadonlyMap<string, Participation>, eligible: ReadonlySet<string>,
  executed: ReadonlySet<string>, windowSeq: number,
) {
  const changes = new Map<string, Participation>();
  for (const id of eligible) {
    const previous = history.get(id) ?? empty;
    const served = executed.has(id);
    if (!served && previous.firstEligibleSeq !== null) continue;
    changes.set(id, {
      ...previous,
      firstEligibleSeq: previous.firstEligibleSeq ?? windowSeq,
      everExecuted: previous.everExecuted || served,
      lastServedSeq: served ? windowSeq : previous.lastServedSeq,
    });
  }
  return changes;
}

export function settleParticipationRaid(
  history: ReadonlyMap<string, Participation>, eligible: ReadonlySet<string>, executed: ReadonlySet<string>,
) {
  const changes = new Map<string, Participation>();
  for (const id of eligible) {
    const previous = history.get(id) ?? empty;
    changes.set(id, {
      ...previous,
      eligibleRaids: previous.eligibleRaids + 1,
      servedRaids: previous.servedRaids + Number(executed.has(id)),
    });
  }
  return changes;
}
