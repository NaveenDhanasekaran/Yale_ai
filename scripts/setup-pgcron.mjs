// Sets up Supabase pg_cron to poll the Vercel email endpoint every 2 minutes.
// Run: DATABASE_URL="postgresql://..." node scripts/setup-pgcron.mjs
import pg from "pg";

const url = process.env.DATABASE_URL;
const endpoint =
  process.env.POLL_URL ||
  "https://yaleit.vercel.app/api/poll-email?secret=yale-local-test-secret-9182";

const sql = `
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $do$ begin
  perform cron.unschedule('poll-yale-email');
exception when others then null; end $do$;
select cron.schedule(
  'poll-yale-email',
  '*/2 * * * *',
  $cmd$select net.http_get(url := '${endpoint}')$cmd$
);
`;

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(
    "select jobid, schedule, jobname, active from cron.job where jobname = 'poll-yale-email'"
  );
  console.log("pg_cron job:", JSON.stringify(rows));
  console.log("Auto-poll every 2 minutes is scheduled.");
} catch (err) {
  console.error("FAILED:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
