import { json } from '../../lib/auth.js';
import { withAuth } from '../../lib/middleware.js';

export default withAuth(async function handler(req, res){
  return json(res, 200, req.user);
});
