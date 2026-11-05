import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { playReplay } from '../apps/server/replay.ts';

test('historical v10 multi-raid replay retains its immutable pre-rotation state digest', async () => {
  const fixture = JSON.parse(await readFile(new URL('./fixtures/auto-v10.json',import.meta.url),'utf8')) as {
    sourceCommit: string; trace: unknown; expectedStateSha256: string; expectedStage: number; expectedResult: string;
  };
  assert.equal(fixture.sourceCommit,'054e544ab2295522e15d69203fd7670ddae1d54a');
  const actual = playReplay(fixture.trace);
  const digest = createHash('sha256').update(JSON.stringify(actual)).digest('hex');
  assert.equal(digest,fixture.expectedStateSha256);
  assert.equal(actual.raid.stage,fixture.expectedStage);
  assert.equal(actual.raid.result,fixture.expectedResult);
});
