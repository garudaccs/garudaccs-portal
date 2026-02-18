import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { q } from '../../lib/db.js';
import { json, signToken } from '../../lib/auth.js';
import { setCookie } from '../../lib/cookies.js';

const Body = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12)
});

export default async function handler(req, res){
  if(req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  let payload = {};
  try{ payload = JSON.parse(req.body || '{}'); }catch{ payload = {}; }
  const parsed = Body.safeParse(payload);
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });

  const email = parsed.data.email.toLowerCase();
  const r = await q('select id, email, role from users where email=$1', [email]);
  if(r.rowCount === 0) return json(res, 401, { error: 'Invalid code' });
  const user = r.rows[0];

  const c = await q(
    `select id, code_hash
     from auth_codes
     where user_id=$1 and consumed_at is null and expires_at > now()
     order by created_at desc
     limit 5`,
    [user.id]
  );
  if(c.rowCount === 0) return json(res, 401, { error: 'Invalid/expired code' });

  let matchId = null;
  for(const row of c.rows){
    const ok = await bcrypt.compare(parsed.data.code, row.code_hash);
    if(ok){ matchId = row.id; break; }
  }
  if(!matchId) return json(res, 401, { error: 'Invalid/expired code' });

  await q('update auth_codes set consumed_at=now() where id=$1', [matchId]);

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  // 7 days
  setCookie(res, 'gccs_token', token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 60*60*24*7 });

  return json(res, 200, { token, user: { id: user.id, email: user.email, role: user.role } });
}
