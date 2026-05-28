/**
 * Security tests: login endpoint – SQL injection hardening.
 *
 * Defense layers verified:
 *   1. `loginSchema` (Zod) rejects payloads that are not valid email addresses
 *      or exceed length limits — the controller and DB are never reached.
 *   2. `authController.login` passes the email value verbatim to
 *      `userModel.findByEmail`, which uses `WHERE email = $1`.  No token is
 *      issued when credentials do not match, regardless of the payload shape.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks (must be declared before the imports they affect) ──────────────────

vi.mock('../../models/userModel.js', () => ({
  findByEmail: vi.fn(),
}));

vi.mock('../../services/authService.js', () => ({
  verifyPassword: vi.fn(),
  signToken: vi.fn(),
  resolveRole: vi.fn(),
  hashPassword: vi.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { loginSchema } from '../../validators/schemas.js';
import { login } from '../../controllers/authController.js';
import { HttpError } from '../../utils/httpError.js';
import * as userModel from '../../models/userModel.js';
import * as authService from '../../services/authService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(body: Record<string, unknown>): Request {
  return { body } as unknown as Request;
}

function makeRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } & Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } & Response;
}

// ── 1. Schema-level: Zod rejects malformed SQL injection payloads ─────────────

describe('loginSchema – SQL injection payloads rejected by Zod (.email() + .max())', () => {
  const invalidEmailPayloads: string[] = [
    "' OR '1'='1",
    '" OR ""="',
    "admin@test.com' --",
    "1; DROP TABLE \"User\"; --",
    "admin'--",
    "' OR 1=1--",
    "' UNION SELECT 1,2,3--",
  ];

  it.each(invalidEmailPayloads)(
    'rejects email="%s" (not a valid email address)',
    (email) => {
      const result = loginSchema.safeParse({ email, password: 'secret' });
      expect(result.success).toBe(false);
    },
  );

  it('rejects email longer than 50 characters', () => {
    // 'a'.repeat(40) + '@example.com' = 52 chars
    const longEmail = 'a'.repeat(40) + '@example.com';
    const result = loginSchema.safeParse({ email: longEmail, password: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects password longer than 72 characters (bcrypt hard limit)', () => {
    const result = loginSchema.safeParse({
      email: 'valid@example.com',
      password: 'x'.repeat(73),
    });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed login body', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'mypassword123',
    });
    expect(result.success).toBe(true);
  });
});

// ── 2. Controller-level: no token issued for SQL injection payloads ───────────

describe('authController.login – SQL injection payloads do not produce a token', () => {
  const next = vi.fn() as unknown as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('email SQL injection payload: findByEmail receives literal string, returns null → 401 no token', async () => {
    vi.mocked(userModel.findByEmail).mockResolvedValue(null);

    const sqlEmail = "' OR '1'='1";
    const res = makeRes();

    await expect(
      login(makeReq({ email: sqlEmail, password: 'anything' }), res, next),
    ).rejects.toMatchObject({ status: 401 });

    // The controller passes the value as-is to findByEmail — parameterised query
    // prevents SQL interpretation at the DB layer.
    expect(userModel.findByEmail).toHaveBeenCalledWith(sqlEmail);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('email with comment marker payload: findByEmail called with literal string → 401 no token', async () => {
    vi.mocked(userModel.findByEmail).mockResolvedValue(null);

    const sqlEmail = "admin@test.com'--";
    const res = makeRes();

    await expect(
      login(makeReq({ email: sqlEmail, password: 'anything' }), res, next),
    ).rejects.toMatchObject({ status: 401 });

    expect(userModel.findByEmail).toHaveBeenCalledWith(sqlEmail);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('password SQL injection payload: verifyPassword rejects it → 401 no token', async () => {
    vi.mocked(userModel.findByEmail).mockResolvedValue({
      user_id: 1,
      name: 'Test User',
      email: 'victim@example.com',
      password: '$2b$10$hashedpassword',
    });
    vi.mocked(authService.verifyPassword).mockResolvedValue(false);

    const res = makeRes();

    await expect(
      login(
        makeReq({ email: 'victim@example.com', password: "' OR '1'='1" }),
        res,
        next,
      ),
    ).rejects.toMatchObject({ status: 401 });

    expect(res.json).not.toHaveBeenCalled();
  });

  it('password OR-clause injection: bcrypt comparison rejects it → 401 no token', async () => {
    vi.mocked(userModel.findByEmail).mockResolvedValue({
      user_id: 2,
      name: 'Another User',
      email: 'user@example.com',
      password: '$2b$10$anotherhash',
    });
    vi.mocked(authService.verifyPassword).mockResolvedValue(false);

    const res = makeRes();

    await expect(
      login(
        makeReq({ email: 'user@example.com', password: 'x OR 1=1' }),
        res,
        next,
      ),
    ).rejects.toMatchObject({ status: 401 });

    expect(authService.signToken).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('non-existent email (any payload): always 401, never a token', async () => {
    vi.mocked(userModel.findByEmail).mockResolvedValue(null);

    const res = makeRes();

    const error = await login(
      makeReq({ email: 'ghost@example.com', password: 'irrelevant' }),
      res,
      next,
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(401);
    expect(res.json).not.toHaveBeenCalled();
  });
});
