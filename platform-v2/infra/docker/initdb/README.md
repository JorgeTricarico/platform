# initdb

This directory is mounted into the PostgreSQL container at `/docker-entrypoint-initdb.d/`.

Any `.sql` or `.sh` files placed here will be executed automatically when the container
is first initialized (i.e., when the data volume is empty).

## Usage

Drop SQL seed files here to auto-populate the database on first run:

```
initdb/
  01_schema_extras.sql   # Any DDL not covered by Prisma migrations
  02_seed_data.sql       # Initial/demo data
```

Files are executed in alphabetical order.

## Notes

- This runs **only once**, when the PostgreSQL data volume is first created.
- For development data, prefer `npm run db:seed` (uses Prisma + TypeScript).
- For production, use Prisma migrations (`prisma migrate deploy`).
