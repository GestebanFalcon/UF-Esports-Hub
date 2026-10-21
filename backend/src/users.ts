import { randomUUID } from 'node:crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export class DuplicateEmailError extends Error {}

export interface UserRepo {
  findByEmail(email: string): Promise<User | undefined>;
  create(data: { email: string; passwordHash: string }): Promise<User>;
}

// Placeholder: replace with Postgres/Prisma/etc.
export class InMemoryUserRepo implements UserRepo {
  private users = new Map<string, User>();

  async findByEmail(email: string) {
    return this.users.get(email);
  }

  async create({ email, passwordHash }: { email: string; passwordHash: string }) {
    if (this.users.has(email)) throw new DuplicateEmailError();
    const user: User = { id: randomUUID(), email, passwordHash, createdAt: new Date() };
    this.users.set(email, user);
    return user;
  }
}