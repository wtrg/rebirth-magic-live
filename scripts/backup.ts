import { backupDatabase } from '../apps/server/backup.ts';

const [, , source, destination] = process.argv;
if (!source || !destination) throw new Error('Usage: node scripts/backup.ts <source.sqlite> <new-destination.sqlite>');
await backupDatabase(source, destination);
console.log('SQLite snapshot created and verified.');
