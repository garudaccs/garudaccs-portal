import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { q } from '../lib/db.js';
import { json, signToken } from '../lib/auth.js';
import { setCookie } from '../lib/cookies.js';
import { withAuth } from '../lib/middleware.js';

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

async function loginHandler(req, res){
  let payload = {};
  try{ payload = typeof req.body === 'string' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})) : (req.body || {}); }catch{}
  const parsed = LoginBody.safeParse(payload);
  if(!parsed.success) return json(res, 400, { error: 'Email and password are required.' });

  const email = parsed.data.email.toLowerCase();
  const r = await q('select id, email, role, password_hash from users where email=$1', [email]);
  if(r.rowCount === 0) return json(res, 401, { error: 'Invalid email or password.' });

  const user = r.rows[0];
  const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
  if(!ok) return json(res, 401, { error: 'Invalid email or password.' });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  setCookie(res, 'gccs_token', token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 60*60*24*7 });

  return json(res, 200, { token, user: { id: user.id, email: user.email, role: user.role } });
}

async function logoutHandler(req, res){
  setCookie(res, 'gccs_token', '', { httpOnly:true, secure:true, sameSite:'Lax', path:'/', maxAge: 0 });
  return json(res, 200, { ok: true });
}

async function meHandler(req, res){
  return json(res, 200, req.user);
}

export default async function handler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action') || '';

  if(action === 'login' && req.method === 'POST') return loginHandler(req, res);
  if(action === 'logout' && req.method === 'POST') return logoutHandler(req, res);
  if(action === 'me') return withAuth(meHandler)(req, res);

  return json(res, 400, { error: 'Unknown action.' });
}
