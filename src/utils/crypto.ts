/**
 * Cryptographic security utilities for PIN and password hashing using Web Crypto API.
 * Format: sha256$<salt_hex>$<hash_hex>
 */

// Generate a cryptographically secure random salt in hex
export const generateSalt = (bytes: number = 16): string => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Convert string to Uint8Array buffer
const stringToBuffer = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

// Convert ArrayBuffer to hex string
const bufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Hashes a PIN or password using SHA-256 with a unique salt.
 * Returns formatted string: "sha256$<salt>$<hash>"
 */
export const hashPin = async (pin: string, existingSalt?: string): Promise<string> => {
  if (!pin) return '';
  const salt = existingSalt || generateSalt(16);
  const data = stringToBuffer(`${salt}:${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = bufferToHex(hashBuffer);
  return `sha256$${salt}$${hashHex}`;
};

/**
 * Checks whether a stored PIN is already securely hashed.
 */
export const isPinHashed = (storedPin?: string | null): boolean => {
  if (!storedPin) return false;
  return storedPin.startsWith('sha256$');
};

/**
 * Verifies a PIN against a stored value (supports both salted hashes and legacy plain-text PINs for seamless upgrade).
 */
export const verifyPin = async (inputPin: string, storedPinOrHash?: string | null): Promise<boolean> => {
  if (!storedPinOrHash || !inputPin) return false;

  // 1. Salted Hash Verification
  if (storedPinOrHash.startsWith('sha256$')) {
    const parts = storedPinOrHash.split('$');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedHash = await hashPin(inputPin, salt);
    return storedPinOrHash === expectedHash;
  }

  // 2. Backward compatibility for legacy plaintext PINs
  return inputPin === storedPinOrHash;
};
