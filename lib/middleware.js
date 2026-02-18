import { getSessionToken, json, verifyToken, roleScopeView } from './auth.js';

export function withAuth(handler){
  return async (req, res) => {
    try{
      const token = getSessionToken(req);
      if(!token) return json(res, 401, { error: 'Missing Authorization: Bearer <token>' });
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        scopeView: roleScopeView(decoded.role)
      };
      return await handler(req, res);
    }catch(e){
      return json(res, 401, { error: 'Invalid/expired token' });
    }
  };
}

export function allowRoles(roles, handler){
  return async (req, res) => {
    if(!req.user) return json(res, 500, { error: 'Auth middleware missing' });
    if(!roles.includes(req.user.role)) return json(res, 403, { error: 'Forbidden' });
    return handler(req, res);
  };
}
