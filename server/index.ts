import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { openDatabase, seed } from './db';
import { createApp } from './app';
const db=openDatabase();seed(db);
const app=createApp(db);
if(existsSync('dist/index.html')) {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}',(_req,res)=>res.sendFile(resolve('dist/index.html')));
}
const server=app.listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log(`BookLeaf API: http://localhost:${process.env.PORT||3001}`));
process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));
