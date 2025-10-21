# How to Generate JWT Tokens for Supabase

This guide will help you create the `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` tokens.

## Step 1: Get Your JWT Secret

From your `.env` file, copy the value of `JWT_SECRET`:
```
JWT_SECRET=q5rPj5euFB4iMzJH4WGpzC9nKT5RWSX5bZGyFKRsyyLFdee2Pp6msL7BRpKKkn1zQnl0WifyGYsvgTLFtxencw==
```

## Step 2: Go to JWT.io

Open https://jwt.io in your browser.

## Step 3: Generate ANON Key

### In the "Decoded" section (left side):

**HEADER:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**PAYLOAD:**
```json
{
  "role": "anon",
  "iss": "supabase",
  "iat": 1577836800,
  "exp": 2147483647
}
```

**VERIFY SIGNATURE:**
Paste your `JWT_SECRET` in the "your-256-bit-secret" field:
```
q5rPj5euFB4iMzJH4WGpzC9nKT5RWSX5bZGyFKRsyyLFdee2Pp6msL7BRpKKkn1zQnl0WifyGYsvgTLFtxencw==
```

### Copy the token

The encoded token appears in the "Encoded" section (right side). Copy the entire string starting with `eyJ...`

This is your **SUPABASE_ANON_KEY**.

## Step 4: Generate SERVICE_ROLE Key

### In the "Decoded" section (left side):

Keep the same HEADER and VERIFY SIGNATURE, but change the PAYLOAD:

**PAYLOAD:**
```json
{
  "role": "service_role",
  "iss": "supabase",
  "iat": 1577836800,
  "exp": 2147483647
}
```

### Copy the token

Copy the new encoded token from the "Encoded" section.

This is your **SUPABASE_SERVICE_ROLE_KEY**.

## Step 5: Update Your .env File

Replace the values in your `.env` file:

```bash
# Supabase Keys
SUPABASE_ANON_KEY="eyJhbGc...your-generated-anon-token..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc...your-generated-service-role-token..."
```

**Important:** Wrap the values in quotes to handle any special characters.

## Step 6: Restart Docker Containers

```bash
docker-compose down -v
docker-compose up -d
```

## Notes

- The `iat` (issued at) timestamp: 1577836800 = Jan 1, 2020
- The `exp` (expiration) timestamp: 2147483647 = Jan 19, 2038 (max 32-bit timestamp)
- These tokens are cryptographically signed with your JWT_SECRET
- Anyone with these tokens can access your database, so keep them secure
- The SERVICE_ROLE key bypasses Row Level Security (RLS) policies - use with caution
