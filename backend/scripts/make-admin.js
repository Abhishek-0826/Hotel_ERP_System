'use strict';

/*
 * Usage: node scripts/make-admin.js <email> [ROLE] [tenantId]
 *   ROLE defaults to PLATFORM_ADMIN (also: OWNER, MANAGER, RECEPTIONIST, STAFF, GUEST)
 *
 * Gives an application role to a person. Sign up through the app first
 * (Supabase Auth) and confirm the email, then run this. If the person has not
 * signed in yet, the profile row is created and linked on their first login.
 */
const prisma = require('../src/config/db');

const ROLES = ['PLATFORM_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF', 'GUEST'];

async function main() {
  const [emailArg, roleArg = 'PLATFORM_ADMIN', tenantArg] = process.argv.slice(2);
  if (!emailArg) throw new Error('Usage: node scripts/make-admin.js <email> [ROLE] [tenantId]');
  const email = emailArg.trim().toLowerCase();
  const role = roleArg.toUpperCase();
  if (!ROLES.includes(role)) throw new Error(`ROLE must be one of: ${ROLES.join(', ')}`);
  if (role === 'PLATFORM_ADMIN') {
    // The platform has exactly one administrator (also enforced by a unique index).
    const other = await prisma.users.findFirst({ where: { role: 'PLATFORM_ADMIN', NOT: { email: { equals: email, mode: 'insensitive' } } } });
    if (other) throw new Error(`A platform admin already exists (${other.email}). Only one is allowed.`);
  }
  const tenantId = role === 'PLATFORM_ADMIN' ? null : (tenantArg ? BigInt(tenantArg) : undefined);

  const existing = await prisma.users.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (existing) {
    await prisma.users.update({
      where: { id: existing.id },
      data: { role, status: 'ACTIVE', ...(tenantId !== undefined ? { tenant_id: tenantId } : {}), updated_at: new Date() },
    });
    console.log(`Updated ${email} -> ${role}`);
  } else {
    await prisma.users.create({
      data: { name: email.split('@')[0].padEnd(2, '_'), email, role, status: 'ACTIVE', tenant_id: tenantId ?? null },
    });
    console.log(`Created ${email} as ${role} (links to Supabase Auth on first sign-in)`);
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
