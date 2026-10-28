import type { RequestHandler } from 'express';
import { hash } from 'bcryptjs';
import { sql } from 'drizzle-orm';
import {
  registerRequestSchema,
  toUser
} from '@uf-esports-hub/shared';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';

// Register a new user
export const register: RequestHandler = async (req, res) => {

  // Validate registration information
  const result = registerRequestSchema.safeParse(req.body);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of result.error.issues) {
      const field = String(issue.path[0] ?? 'form');
      (fieldErrors[field] ??= []).push(issue.message);
    }

    res.status(400).json({
      message: 'Please check your registration information.',
      fieldErrors,
    });
    return;
  }

  const { password } = result.data;
  const username = result.data.username.trim();
  const email = result.data.email.trim().toLowerCase();

  // Check the password length before hashing
  if (Buffer.byteLength(password, 'utf8') > 72) {
    res.status(400).json({
      message: 'Password is too long.',
      fieldErrors: {
        password: ['Password must be at most 72 bytes.'],
      },
    });
    return;
  }

  try {

    // Check if the email already exists
    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existingEmail.length > 0) {
      res.status(409).json({
        message: 'Email is already registered.',
        fieldErrors: {
          email: ['This email is already in use.'],
        },
      });
      return;
    }

    // Check if the username already exists
    const existingUsername = await db
      .select({ id: users.id })
      .from(users)
      .where(
        sql`lower(${users.username}) = ${username.toLowerCase()}`
      )
      .limit(1);

    if (existingUsername.length > 0) {
      res.status(409).json({
        message: 'Username is already taken.',
        fieldErrors: {
          username: ['This username is already in use.'],
        },
      });
      return;
    }

    // Hash the password before saving it
    const hashedPassword = await hash(password, 12);

    // Save the new user to PostgreSQL
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        hashedPassword,
      })
      .onConflictDoNothing()
      .returning();

    // Handle duplicate registration requests
    if (!newUser) {
      res.status(409).json({
        message: 'Email or username is already in use.',
      });
      return;
    }

    // Return user information without the password
    res.status(201).json({
      user: toUser(newUser),
    });

  } catch (error) {
    console.error('Registration failed:', error);

    res.status(500).json({
      message: 'Unable to create account right now.',
    });
  }
};
