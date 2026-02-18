import jwt from 'jsonwebtoken';

export function json(res, status, obj){
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

export function getBearerToken(req){
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export function requireEnv(name){
  const v = process.env[name];
  if(!v) throw new Error(`${name} is not set`);
  return v;
}

export function signToken(payload){
  const secret = requireEnv('JWT_SECRET');
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyToken(token){
  const secret = requireEnv('JWT_SECRET');
  return jwt.verify(token, secret);
}

export function roleScopeView(role){
  // Admin: all data
  // Team: all Adhiratha by default (can be expanded later)
  // Stakeholder: Adhiratha only
  if(role === 'Admin') return 'all';
  if(role === 'Team') return 'adhiratha';
  return 'adhiratha';
}
