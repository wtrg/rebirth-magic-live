import { readFile, stat } from 'node:fs/promises';
import { playReplay } from '../apps/server/replay.ts';

const file = process.argv[2];
if (!file || (await stat(file)).size > 10 * 1024 * 1024) throw new Error('Supply a MOCK replay JSON file (maximum 10 MiB).');
const data = JSON.parse(await readFile(file, 'utf8'));
const state = playReplay(data);
console.log(JSON.stringify({ truncated: data.truncated === true, ...state }, null, 2));
