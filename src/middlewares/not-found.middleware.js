export function notFoundMiddleware(_request, response) {
  return response.status(404).json({ error: 'Not found' });
}
