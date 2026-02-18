import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { q } from '../../lib/db.js';
import { json, requireEnv } from '../../lib/auth.js';

const Body = z.object({
  email: z.string().email(),
  bootstrapSecret: z.string().optional()
});

function genCode(){
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function ensureTable(){
  await q(`
    create table if not exists auth_codes (
      id bigserial primary key,
      user_id bigint not null references users(id) on delete cascade,
      code_hash text not null,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null,
      consumed_at timestamptz
    );
    create index if not exists auth_codes_user_idx on auth_codes(user_id);
    create index if not exists auth_codes_expires_idx on auth_codes(expires_at);
  `);
}

export default async function handler(req, res){
  if(req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  let payload = {};
  try{ payload = JSON.parse(req.body || '{}'); }catch{ payload = {}; }
  const parsed = Body.safeParse(payload);
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });

  const email = parsed.data.email.toLowerCase();
  const r = await q('select id, email, role from users where email=$1', [email]);
  if(r.rowCount === 0) return json(res, 200, { ok: true }); // do not leak existence

  const user = r.rows[0];
  await ensureTable();

  const code = genCode();
  const code_hash = await bcrypt.hash(code, 10);
  const minutes = Number(process.env.MAGIC_CODE_TTL_MINUTES || '10');
  await q(
    `insert into auth_codes(user_id, code_hash, expires_at)
     values ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [user.id, code_hash, minutes]
  );

  // TEMP: until Brevo is wired, only show the code on-screen for Admins
  // or when BOOTSTRAP_SECRET is provided.
  const bootstrap = process.env.BOOTSTRAP_SECRET;
  const isBootstrap = bootstrap && parsed.data.bootstrapSecret && parsed.data.bootstrapSecret === bootstrap;

  if(user.role === 'Admin' || isBootstrap){
    return json(res, 200, { ok: true, devCode: code, ttlMinutes: minutes });
  }

  // For Team/Stakeholder: we behave as if we've emailed the code.
  return json(res, 200, { ok: true, ttlMinutes: minutes });
}
