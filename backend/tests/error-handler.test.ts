import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import type { Request, Response } from 'express';
import { handleError } from '../src/middleware/error-handler.js';

test('client error statuses are preserved without exposing internal error messages', () => {
  for (const error of [
    { status: 400, type: 'request.size.invalid', message: 'private details' },
    { status: 403, message: 'private details' },
    { statusCode: 422, message: 'private details' },
    { status: 429, message: 'private details' },
  ]) {
    let status: number | undefined;
    let body: unknown;
    const response = {
      status(value: number) { status = value; return this; },
      json(value: unknown) { body = value; },
    } as unknown as Response;
    handleError(error, {} as Request, response, () => assert.fail('unexpected next'));
    assert.equal(status, error.status ?? error.statusCode);
    assert.equal(typeof (body as { message: unknown }).message, 'string');
    assert.doesNotMatch(JSON.stringify(body), /private details/);
  }
});

test('unexpected errors and invalid status codes return a generic 500', () => {
  const errors = mock.method(console, 'error', () => {});
  try {
    for (const error of [new Error('private details'), { status: 200 },
      { status: '415' }, { status: 999 }, { status: 400.5 }, { status: 503 }]) {
      let status: number | undefined;
      const response = {
        status(value: number) { status = value; return this; },
        json(value: unknown) { assert.deepEqual(value, { message: 'An unexpected error occurred.' }); },
      } as unknown as Response;
      handleError(error, {} as Request, response, () => assert.fail('unexpected next'));
      assert.equal(status, 500);
    }
    assert.equal(errors.mock.callCount(), 6);
  } finally {
    errors.mock.restore();
  }
});

test('errors after headers are sent are delegated without writing another response', () => {
  const error = new Error('stream failed');
  const response = {
    headersSent: true,
    status() { assert.fail('response already started'); },
    json() { assert.fail('response already started'); },
  } as unknown as Response;
  let forwarded: unknown;
  handleError(error, {} as Request, response, (value) => { forwarded = value; });
  assert.equal(forwarded, error);
});
