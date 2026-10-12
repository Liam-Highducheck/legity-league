// Row shapes for the tables added by the 2026-10-12 migrations. Hand-written until database.types.ts is regenerated.
import type { PeriodKind } from '../periods.ts'

export interface GroupDiscordRow {
  group_id: string
  webhook_configured: boolean
  /** Last 4 characters of the webhook token. The URL itself is never readable from the client. */
  webhook_hint: string | null
  webhook_status: 'ok' | 'invalid'
  enabled: boolean
  post_hour: number
  period_kinds: PeriodKind[]
  post_records: boolean
  post_championships: boolean
  enabled_at: string | null
  records_baselined_at: string | null
  last_error: string | null
  last_error_at: string | null
  last_post_at: string | null
  last_test_at: string | null
}

/** Every column the client may read (webhook_url is deliberately not one of them: select explicit columns, never *). */
export const GROUP_DISCORD_COLUMNS =
  'group_id,webhook_configured,webhook_hint,webhook_status,enabled,post_hour,period_kinds,post_records,post_championships,enabled_at,records_baselined_at,last_error,last_error_at,last_post_at,last_test_at'
