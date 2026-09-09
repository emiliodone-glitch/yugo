/**
 * Datos de contacto dentro de un texto: teléfonos, correos, usuarios de redes
 * y enlaces. Un mensaje de cierre existe para despedirse, no para mover la
 * conversación fuera de Yugo, así que se rechaza antes de llegar al
 * clasificador (que juzga tono, no intención).
 */
const PHONE = /(?:\+?\d[\s.-]?){7,}\d/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
const HANDLE = /(?:^|\s)@[a-z0-9_.]{3,}/i;
const URL = /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|do|net|org|app|me|link)\b/i;
const APPS = /\b(?:whats?app|wasap|telegram|instagram|insta|ig|tiktok|snap(?:chat)?)\b/i;

export function containsContactData(text: string): boolean {
  const normalized = text.normalize('NFKC');
  return (
    PHONE.test(normalized) ||
    EMAIL.test(normalized) ||
    HANDLE.test(normalized) ||
    URL.test(normalized) ||
    APPS.test(normalized)
  );
}
