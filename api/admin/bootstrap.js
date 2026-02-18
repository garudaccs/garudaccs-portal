import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { q } from '../_lib/db.js';
import { json } from '../_lib/auth.js';

const Body = z.object({
  secret: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

export default async function handler(req, res){
  if(req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const parsed = Body.safeParse(JSON.parse(req.body || '{}'));
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });

  if(!process.env.BOOTSTRAP_SECRET) return json(res, 500, { error: 'BOOTSTRAP_SECRET not set' });
  if(parsed.data.secret !== process.env.BOOTSTRAP_SECRET) return json(res, 403, { error: 'Invalid bootstrap secret' });

  const existing = await q('select count(*)::int as c from users');
  if(existing.rows[0].c > 0) return json(res, 409, { error: 'Users already exist' });

  const hash = await bcrypt.hash(parsed.data.password, 12);
  await q(
    'insert into users(email, password_hash, role) values ($1,$2,$3)',
    [parsed.data.email.toLowerCase(), hash, 'Admin']
  );

  return json(res, 200, { ok: true });
}
