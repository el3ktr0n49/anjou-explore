/**
 * Two-Factor Authentication (2FA) with Google Authenticator
 *
 * Validation des codes TOTP (Time-based One-Time Password)
 */

import { generateSecret as otplibGenerateSecret, verify, generateURI } from 'otplib';

/**
 * Vérifie un code 2FA Google Authenticator
 *
 * @param token - Le code à 6 chiffres saisi par l'utilisateur
 * @param secret - Le secret 2FA de l'admin (stocké en BDD)
 * @returns true si le code est valide, false sinon
 *
 * @example
 * await verify2FAToken('123456', 'JBSWY3DPEHPK3PXP') // true ou false
 */
export async function verify2FAToken(token: string, secret: string): Promise<boolean> {
  try {
    // Nettoyer le token (retirer espaces, etc.)
    const cleanToken = token.replace(/\s/g, '');

    // Vérifier le format (6 chiffres)
    if (!/^\d{6}$/.test(cleanToken)) {
      return false;
    }

    // Vérifier avec otplib
    // Note: verify() de la nouvelle API est asynchrone et retourne un objet avec .valid
    const result = await verify({ token: cleanToken, secret });
    return result.valid;
  } catch (error) {
    console.error('Erreur validation 2FA:', error);
    return false;
  }
}

/**
 * Génère un nouveau secret pour un admin
 * (Utilisé lors de la création initiale, voir seed.ts)
 */
export function generateSecret(): string {
  return otplibGenerateSecret();
}

/**
 * Génère l'URI otpauth:// pour créer un QR code
 *
 * @param adminName - Nom de l'admin (José, Fabien, etc.)
 * @param secret - Le secret 2FA
 * @returns L'URI otpauth://
 */
export function generate2FAURI(adminName: string, secret: string): string {
  return generateURI({
    issuer: 'AnjouExplore',
    label: adminName,
    secret,
  });
}
