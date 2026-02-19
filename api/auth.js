import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { q } from '../lib/db.js';
import { json, signToken } from '../lib/auth.js';
import { setCookie } from '../lib/cookies.js';
import { withAuth } from '../lib/middleware.js';

const RequestBody = z.object({ email: z.string().email(), bootstrapSecret: z.string().optional() });
const VerifyBody = z.object({ email: z.string().email(), code: z.string().min(4).max(12) });

function genCode(){ return String(Math.floor(100000 + Math.random() * 900000)); }

async function requestHandler(req, res){
  let payload = {}; try{ payload = JSON.parse(req.body || '{}'); }catch{}
  const parsed = RequestBody.safeParse(payload);
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });
  const email = parsed.data.email.toLowerCase();
  const r = await q('select id, email, role from users where email=$1', [email]);
  if(r.rowCount === 0) return json(res, 200, { ok: true });
  const user = r.rows[0];
  const code = genCode();
  const code_hash = await bcrypt.hash(code, 10);
  const minutes = Number(process.env.MAGIC_CODE_TTL_MINUTES || '10');
  await q(`insert into auth_codes(user_id, code_hash, expires_at) values ($1, $2, now() + ($3 || ' minutes')::interval)`, [user.id, code_hash, minutes]);
  const bootstrap = process.env.BOOTSTRAP_SECRET;
  const isBootstrap = bootstrap && parsed.data.bootstrapSecret && parsed.data.bootstrapSecret === bootstrap;
  if(user.role === 'Admin' || isBootstrap) return json(res, 200, { ok: true, devCode: code, ttlMinutes: minutes });
  return json(res, 200, { ok: true, ttlMinutes: minutes });
}

async function verifyHandler(req, res){
  let payload = {}; try{ payload = JSON.parse(req.body || '{}'); }catch{}
  const parsed = VerifyBody.safeParse(payload);
  if(!parsed.success) return json(res, 400, { error: 'Invalid payload' });
  const email = parsed.data.email.toLowerCase();
  const r = await q('select id, email, role from users where email=$1', [email]);
  if(r.rowCount === 0) return json(res, 401, { error: 'Invalid code' });
  const user = r.rows[0];
  const c = await q(`select id, code_hash from auth_codes where user_id=$1 and consumed_at is null and expires_at > now() order by created_at desc limit 5`, [user.id]);
  if(c.rowCount === 0) return json(res, 401, { error: 'Invalid/expired code' });
  let matchId = null;
  for(const row of c.rows){ if(await bcrypt.compare(parsed.data.code, row.code_hash)){ matchId = row.id; break; } }
  if(!matchId) return json(res, 401, { error: 'Invalid/expired code' });
  await q('update auth_codes set consumed_at=now() where id=$1', [matchId]);
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  setCookie(res, 'gccs_token', token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 60*60*24*7 });
  return json(res, 200, { token, user: { id: user.id, email: user.email, role: user.role } });
}

async function logoutHandler(req, res){
  setCookie(res, 'gccs_token', '', { httpOnly:true, secure:true, sameSite:'Lax', path:'/', maxAge: 0 });
  return json(res, 200, { ok: true });
}

async function meHandler(req, res){ return json(res, 200, req.user); }

export default async function handler(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action') || '';
  if(action === 'request' && req.method === 'POST') return requestHandler(req, res);
  if(action === 'verify' && req.method === 'POST') return verifyHandler(req, res);
  if(action === 'logout' && req.method === 'POST') return logoutHandler(req, res);
  if(action === 'me') return withAuth(meHandler)(req, res);
  return json(res, 400, { error: 'Unknown action. Use ?action=request|verify|logout|me' });
}
