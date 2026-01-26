/**
 * Two-Factor Authentication (2FA) with Google Authenticator
 *
 * Validation des codes TOTP (Time-based One-Time Password)
 */

import { authenticator } from 'otplib';

/**
 * Vérifie un code 2FA Google Authenticator
 *
 * @param token - Le code à 6 chiffres saisi par l'utilisateur
 * @param secret - Le secret 2FA de l'admin (stocké en BDD)
 * @returns true si le code est valide, false sinon
 *
 * @example
 * verify2FAToken('123456', 'JBSWY3DPEHPK3PXP') // true ou false
 */
export function verify2FAToken(token: string, secret: string): boolean {
  try {
    // Nettoyer le token (retirer espaces, etc.)
    const cleanToken = token.replace(/\s/g, '');

    // Vérifier le format (6 chiffres)
    if (!/^\d{6}$/.test(cleanToken)) {
      return false;
    }

    // Vérifier avec otplib
    return authenticator.verify({
      token: cleanToken,
      secret: secret,
    });
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
  return authenticator.generateSecret();
}

/**
 * Génère l'URI otpauth:// pour créer un QR code
 *
 * @param adminName - Nom de l'admin (José, Fabien, etc.)
 * @param secret - Le secret 2FA
 * @returns L'URI otpauth://
 */
export function generate2FAURI(adminName: string, secret: string): string {
  return authenticator.keyuri(adminName, 'Anjou Explore', secret);
}

/**
 * Configuration globale d'otplib
 * (window = 1 permet une tolérance de ±30s pour la synchronisation horaire)
 */
authenticator.options = {
  window: 1, // Tolérance de synchronisation
};
