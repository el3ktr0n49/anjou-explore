/**
 * JWT Token Management
 *
 * Gestion des tokens JWT pour l'authentification admin
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION_HOURS
  ? parseInt(process.env.JWT_EXPIRATION_HOURS)
  : 24;

export interface JWTPayload {
  adminId: string;
  adminName: string;
  iat?: number;
  exp?: number;
}

/**
 * Génère un token JWT pour un admin
 */
export function generateToken(adminId: string, adminName: string): string {
  const payload: JWTPayload = {
    adminId,
    adminName,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${JWT_EXPIRATION}h`,
  });
}

/**
 * Vérifie et décode un token JWT
 * @returns Le payload si valide, null sinon
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    // Token expiré, invalide, ou malformé
    return null;
  }
}

/**
 * Extrait le token depuis un cookie
 */
export function extractTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const authCookie = cookies.find((c) => c.startsWith('auth_token='));

  if (!authCookie) return null;

  return authCookie.split('=')[1];
}

/**
 * Génère le header Set-Cookie pour le token
 */
export function createAuthCookie(token: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = process.env.COOKIE_SECURE === 'true';

  const maxAge = JWT_EXPIRATION * 60 * 60; // en secondes

  const cookieOptions = [
    `auth_token=${token}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly', // Pas accessible via JavaScript
    'SameSite=Strict', // Protection CSRF
  ];

  // HTTPS uniquement en production
  if (isProduction || isSecure) {
    cookieOptions.push('Secure');
  }

  return cookieOptions.join('; ');
}

/**
 * Génère un cookie pour supprimer le token (logout)
 */
export function createLogoutCookie(): string {
  return 'auth_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict';
}
