/**
 * Example: Pull last 24h errors/events and print a report
 *
 * Usage:
 *   VC_HOST=vcenter.example.com VC_USER=admin VC_PASS=secret \
 *     npx tsx examples/error-report.ts
 */
import { VsphereClient } from '../packages/vsphere-client/src/index.js';

async function main() {
  const client = await VsphereClient.connect({
    host: process.env.VC_HOST!,
    username: process.env.VC_USER!,
    password: process.env.VC_PASS!,
    insecure: process.env.VC_INSECURE === 'true', // Only disable TLS verify if explicitly set
    logger: {
      debug: () => {},
      info: console.info,
      warn: console.warn,
      error: console.error,
    },
  });

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch recent events
    console.log('\n=== Last 24h Events ===');
    const events = await client.events.query({ since, maxCount: 50 });

    if (events.length === 0) {
      console.log('  No events found');
    } else {
      for (const event of events) {
        console.log(
          `  [${event.createdTime.toISOString()}] ${event.eventType}: ${event.message}`,
        );
      }
    }

    // Fetch active alarms
    console.log('\n=== Active Alarms ===');
    const alarms = await client.alarms.listActive();

    if (alarms.length === 0) {
      console.log('  No active alarms');
    } else {
      console.table(
        alarms.map((a) => ({
          Entity: a.entityName,
          Alarm: a.alarmName,
          Status: a.status,
          Time: a.time.toISOString(),
          Acknowledged: a.acknowledged,
        })),
      );
    }

    // Fetch recent errors
    console.log('\n=== Recent Errors ===');
    const errors = await client.health.recentErrors({ since });

    if (errors.length === 0) {
      console.log('  No recent errors');
    } else {
      console.table(
        errors.slice(0, 20).map((e) => ({
          Time: e.timestamp.toISOString(),
          Severity: e.severity,
          Source: `${e.sourceType}:${e.sourceId}`,
          Message: e.message.substring(0, 80),
        })),
      );
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log(`  Events: ${events.length}`);
    console.log(`  Active alarms: ${alarms.length}`);
    console.log(`  Errors: ${errors.length}`);
    const redAlarms = alarms.filter((a) => a.status === 'red').length;
    if (redAlarms > 0) {
      console.log(`  *** ${redAlarms} RED alarm(s) require attention ***`);
    }
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
