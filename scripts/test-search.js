import fs from 'node:fs';
import { buildIndex, getIndex, searchProducts } from '../src/search-engine.js';

const products = JSON.parse(fs.readFileSync(new URL('../data/products.json', import.meta.url), 'utf8'));
buildIndex(products);
const INDEX = getIndex();
console.log(`Índice: ${INDEX.length} productos\n`);

const queries = [
  'regalo para nena',
  'algo para el auto',
  'juguete que vuela',
  'cosas para la cocina',
  'muñeca',
  'muneca',                 // sin tilde
  'munecas',                // plural
  'jugete',                 // con error de tipeo
  'menos de 10000',
  'barato',
  'entre 20 y 30 mil',
  'juguete barato para nene',
  'para el colegio',
  'masajeador',
  'dinosaurio',
  'algo para el dolor de espalda',
];

for (const q of queries) {
  const r = searchProducts(q, INDEX);
  const names = r.slice(0, 3).map((p) => `${p.name} ($${p.price.toLocaleString('es-AR')})`);
  console.log(`"${q}"`.padEnd(34) + `${String(r.length).padStart(3)} res  |  ${names.join('  ·  ')}`);
}
