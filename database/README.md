# Silver Key Realty — Database

PostgreSQL schema + test scripts for the Silver Key Realty platform.

## Files

| File | Purpose |
|------|---------|
| `schema.sql` | Full database schema (run once to create all tables) |
| `test-schema.sql` | Comprehensive verification script (16 checks) |
| `quick-check.sql` | Fast status check (3 queries) |

## How to Use

### 1) Initial Setup
Run `schema.sql` in your Supabase SQL editor to create all tables, indexes, policies, and triggers.

```sql
-- Copy and paste schema.sql into Supabase SQL Editor
-- Click "Run" to create all tables
```

### 2) Quick Health Check
Run `quick-check.sql` to verify everything is working:

```sql
-- Copy and paste quick-check.sql into Supabase SQL Editor
-- Should show:
--   ✓ ALL PRESENT for tables and RLS
--   ✓ ALL PRESENT for triggers
--   Row counts for each table
--   Encryption status on recent leads
```

### 3) Detailed Verification
Run `test-schema.sql` for a full audit:

```sql
-- Copy and paste test-schema.sql into Supabase SQL Editor
-- Returns 16 result sets covering:
--   - Table structure
--   - Row counts
--   - Sample data (encrypted fields shown as ENCRYPTED)
--   - Relationship integrity
--   - Index verification
--   - RLS policy check
--   - Trigger verification
--   - Data quality issues
```

## What to Look For

### ✓ Healthy Database
- All 6 tables present
- RLS enabled on all tables
- Indexes on `email_hash`, `phone_hash`, `pathway`, `status`, `created_at`
- Triggers on `leads`, `consultations`, `properties`
- PII fields show as `ENCRYPTED` (not plaintext)
- No data quality issues

### ✗ Issues to Fix
- Missing tables → re-run `schema.sql`
- RLS disabled → check policies in Supabase dashboard
- Plaintext PII → encryption not working (check `ENCRYPTION_KEY` env var)
- Data quality issues → review leads/consultations for invalid values

## Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `team_members` | Internal team (agents, brokers) | `role`, `is_active` |
| `leads` | All lead submissions | `pathway`, `status`, `lead_score`, encrypted PII |
| `lead_activity` | Audit log of all lead changes | `activity_type`, `performed_by_system` |
| `consultations` | Scheduled meetings | `status`, `scheduled_at`, `meeting_type` |
| `properties` | Property listings | 3-dimension scores, `pathway_tags`, `is_public` |
| `lead_property_interest` | Lead saves/inquiries | `interest_level` (viewed → offered) |

## Security Notes

- **All PII is encrypted** with AES-256-GCM before insert.
- **Email/phone hashed** with HMAC-SHA256 for deduplication without decryption.
- **RLS enabled** on all tables (service role bypass, anonymous can only insert leads).
- **Triggers auto-log** status changes and lead creation.
- **Soft delete** via `archived` boolean (never hard delete leads).

## Environment Variables Required

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...  # service_role key (full access)
SUPABASE_ANON_KEY=eyJhbG...     # anon key (public forms)
ENCRYPTION_KEY=32-byte-hex-string  # AES-256 key
```

## Backup

Supabase auto-backups daily. To export manually:

```bash
# From Supabase dashboard:
# Database → Backups → Create backup → Download
```
