import { json } from '../_lib/auth.js';
import { withAuth } from '../_lib/middleware.js';

export default withAuth(async function handler(req, res){
  return json(res, 200, req.user);
});
