# Portfolio privacy lifecycle

Effective October 8, 2026. Public notice: `/privacy/`.

`20261008_chat_retention.sql` limits the portfolio-specific transcript table only. New records expire after 30 days. Existing rows get a 30-day grace period at migration; rollout deletes no records. pg_cron invokes the service-only purge daily at 04:17 UTC. RLS stays enabled and anonymous/authenticated table privileges are revoked. Do not apply this policy to unrelated JobDog or other legacy tables in the same database.

Verify schema defaults, cron.job active flag and cron.job_run_details without selecting message bodies. Alert on failed jobs using Supabase monitoring. Database backups and upstream model/cloud logs follow provider retention independently. Owner email correspondence is retained separately for replies; deletion requests go to the published owner address, with identity checked before deleting. No automated email inbox cleanup is claimed.

For an owner-approved specific deletion, identify matching session or correspondence privately and execute a narrowly scoped removal; never put emails or transcript contents in issue logs. Changing the retention period requires updating the migration/job and public notice together.

Verified rollout: migration applied to the active personal_website database. Schema default and active cron schedule confirmed via metadata; a synthetic expired-row purge check passed inside a transaction that was rolled back. No existing transcript was removed at rollout.
