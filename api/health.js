import { json } from '../lib/auth.js';

export default async function handler(req, res){
  json(res, 200, { ok: true, name: 'garuda-ccs-dashboard', ts: new Date().toISOString() });
}
