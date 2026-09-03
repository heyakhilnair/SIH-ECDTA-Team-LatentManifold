// ECDAT ground truth fixture — quantum-safe / classically-safe Node.js cryptography.
// Uses the Web Crypto API (crypto.subtle), available in modern Node.js.

async function encrypt(data) {
  // AES-256-GCM via Web Crypto — authenticated encryption, 256-bit key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  return key;
}
