# Authentication & TLS

## Basic Authentication

```typescript
const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'administrator@vsphere.local',
  password: 'your-password',
});
```

## TLS Configuration

### Default (Verify Certificates)

By default, the client verifies TLS certificates. This is the recommended setting for production.

### Custom CA Certificate

```typescript
import { readFileSync } from 'node:fs';

const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'admin',
  password: 'pass',
  ca: readFileSync('/path/to/ca-cert.pem'),
});
```

### Skip Verification (Development Only)

```typescript
const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'admin',
  password: 'pass',
  insecure: true, // WARNING: Disables TLS verification
});
```

## Session Lifecycle

- **Login**: Performed automatically during `connect()`
- **Keep-alive**: A background ping (`CurrentTime`) runs every 10 minutes (configurable via `keepAliveIntervalMs`)
- **Session reuse**: The SOAP session cookie is reused for all calls on the same client
- **Logout**: Performed during `disconnect()`

```typescript
const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'admin',
  password: 'pass',
  keepAliveIntervalMs: 300_000, // 5 minutes
});

// ... use client ...

await client.disconnect(); // Logs out and cleans up
```

## Timeout Configuration

```typescript
const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'admin',
  password: 'pass',
  requestTimeoutMs: 30_000, // 30 seconds per SOAP request
});
```

## Custom Port

```typescript
const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  port: 8443, // default: 443
  username: 'admin',
  password: 'pass',
});
```
