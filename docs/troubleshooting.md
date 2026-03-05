# Troubleshooting

## Common Errors

### `VsphereErrorCode.CONNECTION_FAILED`

**Symptoms**: Cannot connect to vCenter

**Causes**:
- vCenter is unreachable (network/firewall)
- Wrong host/port
- WSDL endpoint not available

**Solutions**:
1. Verify the vCenter URL is accessible: `curl -k https://vcenter:443/sdk/vimService.wsdl`
2. Check firewall rules for port 443
3. Ensure the vCenter services are running

### `VsphereErrorCode.AUTH_FAILED`

**Symptoms**: Login rejected

**Causes**:
- Wrong username or password
- Account locked
- Insufficient permissions

**Solutions**:
1. Verify credentials via the vSphere Web Client
2. Check account lockout status in AD/SSO
3. Use the full username format: `administrator@vsphere.local`

### `VsphereErrorCode.SESSION_EXPIRED`

**Symptoms**: Operations fail after idle period

**Causes**:
- Session timeout (default: 30 minutes in vCenter)
- Keep-alive interval too long

**Solutions**:
1. Reduce `keepAliveIntervalMs` (default: 600000ms = 10 min)
2. Reconnect on session expiry

### Self-Signed Certificate Errors

**Symptoms**: `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or `DEPTH_ZERO_SELF_SIGNED_CERT`

**Solutions**:
1. **Recommended**: Provide the CA cert via the `ca` option
2. **Development only**: Set `insecure: true`
3. **Never** set `NODE_TLS_REJECT_UNAUTHORIZED=0` globally

### SOAP Fault: `NoPermission`

**Symptoms**: Specific operations fail with permission errors

**Solutions**:
1. Check the user's role assignments in vCenter
2. Ensure the role has the required privileges for the operation
3. Check if the operation is restricted at the datacenter/cluster level

## Debug Logging

Enable debug logging to see all SOAP calls:

```typescript
const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'admin',
  password: 'pass',
  logger: {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  },
});
```

## SOAP Fault Inspection

All SOAP faults are wrapped in `VsphereError`. Access the raw fault:

```typescript
try {
  await client.vm.powerOn(vmRef);
} catch (err) {
  if (err instanceof VsphereError) {
    console.error('Code:', err.code);
    console.error('Message:', err.message);
    console.error('Raw SOAP fault:', JSON.stringify(err.soapFault, null, 2));
  }
}
```

## Task Timeouts

If tasks time out, increase the timeout:

```typescript
const task = await client.snapshots.create(vmRef, { name: 'backup' });
await task.wait({
  timeoutMs: 600_000,  // 10 minutes
  pollIntervalMs: 5_000, // poll every 5 seconds
  onProgress: (p) => console.log(`${p}%`),
});
```
