# nodevecenter - VMware vSphere Node.js TypeScript Library

## Project Overview
Production-grade npm package (library, not app) for managing multiple VMware vCenters.
Provides typed APIs for inventory, snapshots, events/alarms, VM operations, and task management.

## Tech Stack
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js >= 20, ESM only
- **Build**: tsup (ESM output)
- **Test**: vitest
- **Lint**: ESLint + Prettier
- **Docs**: typedoc
- **Package manager**: npm

## Architecture
- **SOAP-first**: VIM/Web Services SDK is the primary API layer
- **Adapter pattern**: REST can be added later behind the same interface
- **Multi-vCenter**: Each VsphereClient is an independent instance with its own session
- **Concurrency control**: Rate limiting + connection pooling per client
- **Managed Objects**: All vSphere objects referenced via MoRef { type, value }

## Repository Structure
```
/packages/vsphere-client/     # Main library package
  src/
    client/                    # VsphereClient, connection, auth, session
    soap/                      # SOAP client layer, WSDL, interceptors
    inventory/                 # Datacenter, cluster, host, VM inventory
    vm/                        # VM power ops, reconfigure
    snapshots/                 # Snapshot CRUD + consolidate
    events/                    # Events query
    alarms/                    # Active alarms
    health/                    # Error aggregation
    tasks/                     # TaskHandle, polling, wait
    types/                     # Domain models, MoRef, errors
    mappers/                   # SOAP -> domain model converters
    utils/                     # Logger, rate limiter, retry
  tests/
    unit/                      # Unit tests (mappers, tasks, utils)
    integration/               # Integration tests (skipped by default, need env vars)
/examples/                     # Usage scripts
/docs/                         # Documentation
.github/workflows/             # CI pipeline
```

## Key Conventions
- All public API methods are async
- All mutating operations return a TaskHandle
- Errors are typed VsphereError with error codes and raw SOAP fault
- Logger is injectable: { debug, info, warn, error }
- SSL/TLS: verify by default, support custom CA and insecure flag
- No default exports; use named exports only

## Development Commands
```bash
npm install                    # Install deps
npm run build                  # Build library
npm run test                   # Run unit tests
npm run test:integration       # Run integration tests (needs VC_HOST, VC_USER, VC_PASS)
npm run lint                   # Lint
npm run format                 # Format with Prettier
npm run docs                   # Generate typedoc
```

## Testing
- Unit tests: vitest, test mappers + task engine + utils
- Integration tests: skipped by default, use env vars VC_HOST, VC_USER, VC_PASS
- CI runs lint + unit tests + build

## Important Notes
- Never hardcode credentials
- Always use MoRef for object references, not display names
- SOAP faults must be caught and wrapped in VsphereError
- Session cookies must be managed per-client instance
