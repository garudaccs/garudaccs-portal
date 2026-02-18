import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { q } from '../_lib/db.js';
import { json, signToken, roleScopeView } from '../_lib/auth.js';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export default async function handler(req, res){
  if(req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const parsed = Body.safeParse(JSON.parse(req.body || '{}'));
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });

  const email = parsed.data.email.toLowerCase();
  const r = await q('select id, email, password_hash, role from users where email=$1', [email]);
  if(r.rowCount === 0) return json(res, 401, { error: 'Invalid email/password' });

  const user = r.rows[0];
  const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
  if(!ok) return json(res, 401, { error: 'Invalid email/password' });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return json(res, 200, {
    token,
    user: { id: user.id, email: user.email, role: user.role, scopeView: roleScopeView(user.role) }
  });
}
