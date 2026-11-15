import path from 'node:path';
import express from 'express';
import authRoutes from './routes/auth.routes.js';
import notesRoutes from './routes/notes.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, '..', 'public'), { extensions: ['html'] }));

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta ne postoji.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Greška na serveru.' });
});

export default app;
