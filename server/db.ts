import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Author } from './domain';
export function hashPassword(password:string) {const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function checkPassword(password:string,stored:string) {const [salt,hash]=stored.split(':');return timingSafeEqual(Buffer.from(hash,'hex'),scryptSync(password,salt,64));}
export function openDatabase(path=process.env.DATABASE_PATH||'data/bookleaf.sqlite') {
  if(path!==':memory:') mkdirSync(dirname(resolve(path)),{recursive:true});
  const db=new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('author','admin')));
    CREATE TABLE IF NOT EXISTS authors(id TEXT PRIMARY KEY REFERENCES users(id),profile TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS books(id TEXT PRIMARY KEY,author_id TEXT NOT NULL REFERENCES authors(id),details TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,author_id TEXT NOT NULL REFERENCES authors(id),book_id TEXT REFERENCES books(id),subject TEXT NOT NULL,description TEXT NOT NULL,category TEXT NOT NULL,priority TEXT NOT NULL,status TEXT NOT NULL,assigned_to TEXT REFERENCES users(id),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,ai_source TEXT NOT NULL,ai_draft TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES tickets(id),user_id TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,internal INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS ticket_author ON tickets(author_id);
    CREATE INDEX IF NOT EXISTS message_ticket ON messages(ticket_id);`);
  return db;
}
export function seed(db:DatabaseSync) {
  const {authors}=JSON.parse(readFileSync(new URL('../bookleaf_sample_data (1).json',import.meta.url),'utf8')) as {authors:Author[]};
  const password=hashPassword(process.env.SEED_PASSWORD||'BookLeaf123!');
  db.exec('BEGIN');
  try {
    for(const author of authors) {
      db.prepare('INSERT OR IGNORE INTO users VALUES(?,?,?,?,?)').run(author.author_id,author.name,author.email,password,'author');
      const {books,...profile}=author;
      db.prepare('INSERT OR IGNORE INTO authors VALUES(?,?)').run(author.author_id,JSON.stringify(profile));
      for(const book of books) db.prepare('INSERT OR IGNORE INTO books VALUES(?,?,?)').run(book.book_id,author.author_id,JSON.stringify(book));
    }
    db.prepare('INSERT OR IGNORE INTO users VALUES(?,?,?,?,?)').run('ADMIN001','BookLeaf Team','admin@bookleaf.com',password,'admin');
    db.exec('COMMIT');
  } catch(error){db.exec('ROLLBACK');throw error;}
}
