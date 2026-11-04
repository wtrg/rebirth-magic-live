# Security

Loopback only. Host and Origin are checked for writes and WebSocket upgrade. Use a dedicated local operator computer. Any user on that computer with browser access can operate the console. Use strict input bounds, JSON only, bounded queues, rate limits, persistent event IDs and DOM textContent. Only build output is served. No user secrets are accepted or logged.

Before public pushes, inspect staged files and license metadata. SQLite and environment files are ignored. Use synthetic viewer accounts in evidence. Use the [SQLite backup command](RECOVERY.md) for consistent local snapshots. Keep backups private and restore to a new database path.

A network-facing operator, authentic LIVE ingestion, replay storage and long-session resilience require new QA gates.
