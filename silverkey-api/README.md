# 🔑 Silver Key Realty API

Platform API for Silver Key Realty — powered by QUAM Core, GPT-5.2, and 30 Supabase tables.

## Architecture

- **Database**: Supabase (30 `skr_` + `qc_` tables with RLS, triggers, state machines)
- **AI**: Azure OpenAI GPT-5.2 (`skr-gpt52` deployment in `silver-key-realty-foundry`)
- **Secrets**: Azure Key Vault (`silver-key-realty-vault`)
- **Deployment**: Vercel (auto-deploy on push to main)
- **Encryption**: AES-256-GCM for PII, HMAC-SHA256 for lookups

## Endpoints

### Public (no auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pathways` | List pathway options |
| GET | `/api/properties` | List public listings |
| GET | `/api/agents` | List team or "coming soon" |
| POST | `/api/leads` | Submit lead (encrypted + AI scored) |
| POST | `/api/agents` | Submit agent application |
| POST | `/api/analytics` | Log frontend event |
| POST | `/api/ai/concierge` | Chat with AI concierge |

### Dashboard (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leads` | List leads (decrypted) |
| PUT | `/api/leads` | Update lead (state machine) |
| GET/POST | `/api/interactions` | CRM interactions |
| GET/POST | `/api/consultations` | Meeting management |
| GET/PUT | `/api/notifications` | Notification center |
| GET/POST/PUT | `/api/rules` | Business rules engine |

### AI Intelligence
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/score-lead` | AI lead scoring (0-100) |
| POST | `/api/ai/analyze` | Dana's analytics brain |
| POST | `/api/ai/sentiment` | Interaction sentiment |
| POST | `/api/ai/property-narrative` | Property description generator |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Full system health check |

## Setup

1. Clone repo
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in values from Azure Key Vault
4. `npm run dev`
5. Push to main → auto-deploys to Vercel

## Key Vault Secrets (silver-key-realty-vault)

All secrets stored in Azure Key Vault. Vercel env vars are copies for speed.

| Vault Secret | Vercel Env Var |
|-------------|----------------|
| `silver-key-realty-gpt-five-point-two-chat` | `silver_key_realty_gpt_five_point_two_chat` |
| `silver-key-realty-openai-endpoint` | `SKR_AZURE_OPENAI_ENDPOINT` |
| `silver-key-realty-encryption-key` | `SKR_ENCRYPTION_KEY` |
