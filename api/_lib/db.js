import pg from 'pg';

let pool;

export function getPool(){
  if(pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if(!connectionString) throw new Error('DATABASE_URL is not set');

  pool = new pg.Pool({
    connectionString,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
  });
  return pool;
}

export async function q(text, params){
  const p = getPool();
  return p.query(text, params);
}
