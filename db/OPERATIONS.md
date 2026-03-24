# Database Operations

## Engine

PostgreSQL is the primary runtime database. Prisma is the schema and migration layer.

## Backup policy

- Daily logical backups with `pg_dump` retained for 14 days.
- Weekly full snapshots retained for 8 weeks.
- Point-in-time recovery enabled in production.

## Restore drill

- Restore the latest snapshot to a staging database.
- Reapply app secrets.
- Run `prisma migrate deploy`.
- Run smoke tests for auth, query execution, billing, and lead detail routes.

## Production guardrails

- Separate databases for development, staging, and production.
- Never point local migrations at production.
- Restrict production database credentials to the app runtime and CI deploy identity.
