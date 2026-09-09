-- Idioma de la interfaz por persona (RNF-06).
ALTER TABLE "User" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'es-DO';
