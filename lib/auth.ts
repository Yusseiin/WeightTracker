import { promises as fs } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { User, SessionUser, SESSION_COOKIE_NAME, CreateUserRequest, UserRole } from './types';

// Config directory - configurable via env for Docker/Unraid
const CONFIG_PATH = process.env.CONFIG_PATH || '/config';
const USERS_DIR = path.join(CONFIG_PATH, 'users');
const USERS_FILE = path.join(USERS_DIR, 'users.json');

// Legacy path for migration
const LEGACY_USERS_FILE = path.join(CONFIG_PATH, 'users.json');

// Ensure data directories exist
async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(USERS_DIR);
  } catch {
    await fs.mkdir(USERS_DIR, { recursive: true });
  }
}

// Check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Migrate users from old structure to new structure
async function migrateUsersIfNeeded(): Promise<void> {
  const legacyExists = await fileExists(LEGACY_USERS_FILE);
  const newExists = await fileExists(USERS_FILE);

  if (legacyExists && !newExists) {
    await ensureDataDir();
    const data = await fs.readFile(LEGACY_USERS_FILE, 'utf-8');
    const users = JSON.parse(data) as Array<{
      username: string;
      password: string;
      nickname: string;
      role?: UserRole;
      createdAt?: string;
    }>;

    // Add role and createdAt to users that don't have them
    const migratedUsers: User[] = users.map((user, index) => ({
      username: user.username,
      password: user.password,
      nickname: user.nickname,
      role: user.role || (index === 0 ? 'admin' : 'user'),
      createdAt: user.createdAt || new Date().toISOString()
    }));

    await fs.writeFile(USERS_FILE, JSON.stringify(migratedUsers, null, 2), 'utf-8');

    // Delete legacy file after successful migration
    await fs.unlink(LEGACY_USERS_FILE);
  }
}

// Get all users from the JSON file
export async function getUsers(): Promise<User[]> {
  await ensureDataDir();
  await migrateUsersIfNeeded();

  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    const users = JSON.parse(data) as Array<{
      username: string;
      password: string;
      nickname: string;
      role?: UserRole;
      createdAt?: string;
    }>;

    // Ensure all users have role and createdAt (backward compatibility)
    return users.map((user, index) => ({
      username: user.username,
      password: user.password,
      nickname: user.nickname,
      role: user.role || (index === 0 ? 'admin' : 'user'),
      createdAt: user.createdAt || new Date().toISOString()
    }));
  } catch {
    // File doesn't exist, create with default admin user
    const defaultUsers: User[] = [
      {
        username: 'admin',
        password: 'changeme',
        nickname: 'Administrator',
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ];
    await fs.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2), 'utf-8');
    return defaultUsers;
  }
}

// Save users to file
async function saveUsers(users: User[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// Validate user credentials
export async function validateUser(username: string, password: string): Promise<User | null> {
  const users = await getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
}

// Get user by username (without password)
export async function getUserByUsername(username: string): Promise<SessionUser | null> {
  const users = await getUsers();
  const user = users.find(u => u.username === username);
  if (!user) return null;
  return {
    username: user.username,
    nickname: user.nickname,
    role: user.role
  };
}

// Get current session from cookie
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const session: SessionUser = JSON.parse(sessionCookie.value);
    return session;
  } catch {
    return null;
  }
}

// Create session cookie value
export function createSessionValue(user: User): string {
  const sessionUser: SessionUser = {
    username: user.username,
    nickname: user.nickname,
    role: user.role
  };
  return JSON.stringify(sessionUser);
}

// Create a new user (admin only)
export async function createUser(data: CreateUserRequest): Promise<User> {
  const users = await getUsers();

  // Check if username already exists
  if (users.some(u => u.username === data.username)) {
    throw new Error('Username already exists');
  }

  // Validate username format (alphanumeric, 3-20 chars)
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(data.username)) {
    throw new Error('Username must be 3-20 alphanumeric characters');
  }

  // Validate password length
  if (data.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const newUser: User = {
    username: data.username,
    password: data.password,
    nickname: data.nickname || data.username,
    role: data.role,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await saveUsers(users);

  return newUser;
}

// Update user password
export async function updateUserPassword(
  username: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.username === username);

  if (userIndex === -1) {
    throw new Error('User not found');
  }

  if (users[userIndex].password !== currentPassword) {
    throw new Error('Current password is incorrect');
  }

  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  users[userIndex].password = newPassword;
  await saveUsers(users);
}

// Update user (admin only)
export async function updateUser(
  username: string,
  data: { nickname?: string; role?: UserRole }
): Promise<User> {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.username === username);

  if (userIndex === -1) {
    throw new Error('User not found');
  }

  if (data.nickname !== undefined) {
    users[userIndex].nickname = data.nickname;
  }

  if (data.role !== undefined) {
    users[userIndex].role = data.role;
  }

  await saveUsers(users);
  return users[userIndex];
}

// Delete user (admin only)
export async function deleteUser(username: string): Promise<void> {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.username === username);

  if (userIndex === -1) {
    throw new Error('User not found');
  }

  users.splice(userIndex, 1);
  await saveUsers(users);
}

// Get all users without passwords (for admin listing)
export async function getUsersWithoutPasswords(): Promise<Omit<User, 'password'>[]> {
  const users = await getUsers();
  return users.map(({ password, ...user }) => user);
}
