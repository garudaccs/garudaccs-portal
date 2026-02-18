export function parseCookies(header){
  const out = {};
  if(!header) return out;
  const parts = header.split(';');
  for(const p of parts){
    const i = p.indexOf('=');
    if(i === -1) continue;
    const k = p.slice(0,i).trim();
    const v = p.slice(i+1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export function setCookie(res, name, value, opts = {}){
  const {
    httpOnly = true,
    secure = true,
    sameSite = 'Lax',
    path = '/',
    maxAge,
    expires,
  } = opts;

  let cookie = `${name}=${encodeURIComponent(value)}`;
  if(path) cookie += `; Path=${path}`;
  if(httpOnly) cookie += '; HttpOnly';
  if(secure) cookie += '; Secure';
  if(sameSite) cookie += `; SameSite=${sameSite}`;
  if(typeof maxAge === 'number') cookie += `; Max-Age=${maxAge}`;
  if(expires) cookie += `; Expires=${expires.toUTCString()}`;

  const prev = res.getHeader('Set-Cookie');
  const next = prev ? (Array.isArray(prev) ? [...prev, cookie] : [prev, cookie]) : cookie;
  res.setHeader('Set-Cookie', next);
}
