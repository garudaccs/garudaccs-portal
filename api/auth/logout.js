import { json } from '../../lib/auth.js';
import { setCookie } from '../../lib/cookies.js';

export default async function handler(req, res){
  if(req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  // expire cookie
  setCookie(res, 'gccs_token', '', { httpOnly:true, secure:true, sameSite:'Lax', path:'/', maxAge: 0 });
  return json(res, 200, { ok: true });
}
