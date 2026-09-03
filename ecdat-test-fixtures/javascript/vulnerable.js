// ECDAT ground truth fixture — deliberately vulnerable Node.js cryptography.
const crypto = require('crypto');

// MD5 — cryptographically broken
const checksum = crypto.createHash('md5').update('some-data').digest('hex');

// SHA-1 — cryptographically broken (Shattered 2017)
const legacySig = crypto.createHash('sha1').update('legacy-payload').digest('hex');

// 3DES — deprecated (Sweet32), 64-bit block size
const cipher = crypto.createCipheriv('des-ede3-cbc', Buffer.alloc(24), Buffer.alloc(8));

// RSA:2048 key pair generation — quantum vulnerable
crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
