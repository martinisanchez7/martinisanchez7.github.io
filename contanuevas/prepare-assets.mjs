import { copyFile, mkdir } from 'node:fs/promises';

const directory = new URL('./public/',import.meta.url);
await mkdir(directory,{recursive:true});
const files = ['index.html','estilo.css','app.js','marca.svg','icono.svg','serif.woff2','sans.woff2','openapi.json'];
await Promise.all(files.map(file=>copyFile(new URL(file,import.meta.url),new URL(file,directory))));
