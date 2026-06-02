/** JSON responses for Express and Vercel serverless. */
export function json(res, status, body) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(body);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function setCookie(res, value) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Set-Cookie', value);
  }
}
