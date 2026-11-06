import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { participationOrder, participationPolicyId } from '../apps/server/participation.ts';

const ids = Array.from({ length: 32 }, (_, i) => 'mock:matrix' + i);
const rosters = [
  [ids],
  [ids.slice(0, 24), ids],
  [ids.slice(0, 24), [...ids.slice(0, 16), ...ids.slice(24)], ids],
];
const policies = {
  current: (a, b) => b.debt - a.debt,
  cappedDebtOldestService: (a, b) => Math.min(4, b.debt) - Math.min(4, a.debt) ||
    a.lastServed - b.lastServed,
  smoothedServiceRate: (a, b) => (a.served + 1) * (b.eligible + 4) - (b.served + 1) * (a.eligible + 4) ||
    a.lastServed - b.lastServed,
  eligibleWait: (a, b) => a.lastServed - b.lastServed || b.wait - a.wait,
};

function run(pattern, stages, capacity, compare) {
  const players = new Map(ids.map(id => [id, { id, debt: 0, eligible: 0, served: 0, wait: 0, maxWait: 0,
    lastServed: 0, firstEligible: null }]));
  for (let stage = 1; stage <= stages; stage++) {
    const candidates = pattern[(stage - 1) % pattern.length].map(id => ({
      player: players.get(id),
      playerId: id,
      tie: createHash('sha256').update(JSON.stringify([stage, id])).digest('hex'),
    }));
    if (compare) {
      candidates.sort((a, b) => compare(a.player, b.player) || (a.tie < b.tie ? -1 : a.tie > b.tie ? 1 : 0));
    } else {
      const history = new Map([...players].map(([id, player]) => [id, {
        eligibleRaids: player.eligible, servedRaids: player.served, everExecuted: player.served > 0,
        firstEligibleSeq: player.firstEligible, lastServedSeq: player.lastServed || null,
      }]));
      candidates.sort(participationOrder(history, stage));
    }
    for (const [index, { player }] of candidates.entries()) {
      player.firstEligible ??= stage;
      player.eligible++;
      if (index < capacity) {
        player.debt = Math.max(0, player.debt - 1);
        player.served++;
        player.lastServed = stage;
        player.wait = 0;
      } else {
        player.debt = Math.min(32, player.debt + 1);
        player.wait++;
        player.maxWait = Math.max(player.maxWait, player.wait);
      }
    }
  }
  const outcomes = [...players.values()];
  assert.equal(outcomes.reduce((sum, player) => sum + player.served, 0), capacity * stages);
  return {
    zero: outcomes.filter(player => player.served === 0).length,
    worstEligibleWait: Math.max(...outcomes.map(player => player.maxWait)),
    minRate: Math.min(...outcomes.map(player => player.served / player.eligible)),
    maxRate: Math.max(...outcomes.map(player => player.served / player.eligible)),
    served: outcomes.map(player => player.served),
    players: outcomes,
  };
}

for (const pattern of rosters) {
  for (const stages of [36, 96]) {
    for (const capacity of [1, 6]) {
      for (const [policy, compare] of [...Object.entries(policies), [participationPolicyId, null]]) {
        console.log(JSON.stringify({ roster: pattern.map(group => group.length), stages, capacity,
          policy, ...run(pattern, stages, capacity, compare) }));
      }
    }
  }
}
