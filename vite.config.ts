import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const pdfName = 'Printable-Puzzle-Book.pdf';
const pdfPath = resolve('My Self-referential Puzzle Book_260927_140533.pdf');

export default defineConfig({
  plugins: [react(), {
    name: 'original-printable-pdf',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== `/${pdfName}`) return next();
        response.setHeader('Content-Type', 'application/pdf');
        response.setHeader('Content-Length', statSync(pdfPath).size);
        createReadStream(pdfPath).pipe(response);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: pdfName, source: readFileSync(pdfPath) });
    },
  }],
  base: process.env.VITE_BASE_PATH ?? './',
  test: { environment: 'node', include: ['src/**/*.test.ts', 'workers/**/*.test.ts'] },
});
