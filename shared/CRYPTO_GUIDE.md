# Crypto Quick Reference

## 🚀 Import & Use

```typescript
import {
  hash256, // SHA-256 hash
  hmacSHA256, // HMAC signature
  verifyHMAC, // Verify HMAC
  randomHex, // Random hex string
  generateToken, // API keys/tokens
  hashObject, // Hash objects
} from "@shared/crypto";
```

## ✅ Use Cases

### Hash Data

```typescript
const hash = hash256("my data");
```

### Verify Webhook

```typescript
const isValid = verifyHMAC(secret, payload, signature);
```

### Generate API Key

```typescript
const apiKey = generateToken(32);
```

### Hash Object

```typescript
const cacheKey = hashObject({ userId: 123 });
```

## ❌ Don't Use For

- ❌ Passwords → Use `bcryptjs`
- ❌ Encryption → Use `@noble/ciphers` or Web Crypto
- ❌ JWT → Use `jsonwebtoken` or `jose`

## 🔒 Current Stack

| Use Case   | Library                       |
| ---------- | ----------------------------- |
| Hashing    | `@noble/hashes` ← THIS MODULE |
| Passwords  | `bcryptjs`                    |
| Encryption | NOT NEEDED YET                |
| JWT        | NOT NEEDED YET                |
