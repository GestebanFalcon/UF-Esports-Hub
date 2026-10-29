import type { ErrorRequestHandler } from 'express';

const clientErrorMessages = new Map([
  ['entity.parse.failed', 'Request body must be valid JSON.'],
  ['entity.too.large', 'Request body is too large.'],
  ['charset.unsupported', 'Request body charset is not supported.'],
  ['encoding.unsupported', 'Request body encoding is not supported.'],
  ['request.size.invalid', 'Request body length does not match Content-Length.'],
]);

export const handleError: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = error?.status ?? error?.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    res.status(status).json({ message: clientErrorMessages.get(error?.type) ?? 'Invalid request.' });
    return;
  }

  console.error('Request failed:', error);
  res.status(500).json({ message: 'An unexpected error occurred.' });
};
