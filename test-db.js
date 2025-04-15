import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Conexión exitosa a PostgreSQL');
    
    const result = await client.query('SELECT NOW()');
    console.log('Hora del servidor:', result.rows[0].now);
    
    client.release();
  } catch (err) {
    console.error('Error al conectar a PostgreSQL:', err);
  } finally {
    await pool.end();
  }
}

testConnection();