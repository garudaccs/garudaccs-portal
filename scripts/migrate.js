import fs from 'node:fs';
import path from 'node:path';
import { getPool } from '../lib/db.js';

async function main(){
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const pool = getPool();
  const client = await pool.connect();
  try{
    await client.query('begin');
    await client.query(sql);
    await client.query('commit');
    console.log('✅ Migration applied from schema.sql');
  }catch(e){
    await client.query('rollback');
    console.error('❌ Migration failed:', e);
    process.exitCode = 1;
  }finally{
    client.release();
    await pool.end();
  }
}

main();
