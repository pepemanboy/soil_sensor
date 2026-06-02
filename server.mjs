/**
 * Satisfies `vercel dev` entrypoint detection only.
 * Production uses public/ + api/ (this file is in .vercelignore).
 */
export default function handler(_req, res) {
  res.statusCode = 404;
  res.end();
}
