'use strict';

/*
 * Creates (or refreshes) a ready-to-test hotel: tenant + published property +
 * rooms + beds + an owner profile row.
 *
 * Usage: node scripts/create-test-hotel.js [ownerEmail] [slug]
 *   ownerEmail  default: owner.test@example.com  (use an inbox YOU control)
 *   slug        default: sunrise-test            (hotel URL: /<slug>)
 *
 * The owner row has no Supabase login yet: the owner either gets an invite
 * from the platform console, or signs up at /<slug>/register with this email.
 * Safe to re-run: existing records are reused.
 */
const prisma = require('../src/config/db');

async function main() {
  const ownerEmail = (process.argv[2] || 'owner.test@example.com').toLowerCase();
  const slug = (process.argv[3] || 'sunrise-test').toLowerCase();

  let tenant = await prisma.tenants.findUnique({ where: { slug } });
  if (!tenant) {
    tenant = await prisma.tenants.create({
      data: {
        display_name: 'Sunrise Test Stay',
        legal_name: 'Sunrise Test Stay Pvt Ltd',
        slug,
        status: 'ACTIVE',
        tagline: 'Comfortable beds, friendly people',
        description: 'A test hotel used to verify the ROOST booking flow end to end.',
        contact_email: ownerEmail,
        contact_phone: '9876500000',
        address: '12 MG Road',
        city: 'Pune',
        state: 'Maharashtra',
        postal_code: '411001',
        onboarding_completed: false, // the owner completes the setup form on first sign-in
      },
    });
    console.log(`Created hotel "${tenant.display_name}" -> /${slug}`);
  } else {
    console.log(`Hotel /${slug} already exists (id ${tenant.id})`);
  }

  const owner = await prisma.users.findFirst({ where: { email: { equals: ownerEmail, mode: 'insensitive' } } });
  if (!owner) {
    await prisma.users.create({
      data: { name: 'Test Owner', email: ownerEmail, role: 'OWNER', status: 'ACTIVE', tenant_id: tenant.id },
    });
    console.log(`Created owner profile ${ownerEmail}`);
  } else if (owner.tenant_id?.toString() !== tenant.id.toString() || owner.role !== 'OWNER') {
    await prisma.users.update({ where: { id: owner.id }, data: { role: 'OWNER', tenant_id: tenant.id, status: 'ACTIVE' } });
    console.log(`Updated ${ownerEmail} to OWNER of /${slug}`);
  }

  let property = await prisma.properties.findFirst({ where: { tenant_id: tenant.id, slug: 'sunrise-main' } });
  if (!property) {
    property = await prisma.properties.create({
      data: {
        tenant_id: tenant.id,
        name: 'Sunrise Main Branch',
        slug: 'sunrise-main',
        description: 'Central location, 24x7 security, free Wi-Fi.',
        address: '12 MG Road',
        city: 'Pune',
        state: 'Maharashtra',
        postal_code: '411001',
        property_type: 'PG',
        gender_policy: 'MIXED',
        status: 'PUBLISHED',
      },
    });
    console.log('Created property "Sunrise Main Branch"');
  }

  const roomPlan = [
    { roomNumber: '101', hasAc: true, price: 900, beds: ['A', 'B', 'C', 'D'] },
    { roomNumber: '102', hasAc: false, price: 600, beds: ['A', 'B', 'C', 'D', 'E', 'F'] },
  ];
  for (const plan of roomPlan) {
    let room = await prisma.rooms.findFirst({ where: { property_id: property.id, room_number: plan.roomNumber } });
    if (!room) {
      room = await prisma.rooms.create({
        data: {
          tenant_id: tenant.id,
          property_id: property.id,
          room_number: plan.roomNumber,
          floor: 1,
          gender_policy: 'MIXED',
          has_ac: plan.hasAc,
          has_attached_bathroom: plan.hasAc,
          base_price: plan.price,
          status: 'ACTIVE',
        },
      });
      for (const [index, code] of plan.beds.entries()) {
        await prisma.beds.create({
          data: {
            tenant_id: tenant.id,
            room_id: room.id,
            bed_code: `${plan.roomNumber}-${code}`,
            position: index % 2 === 0 ? 'LOWER' : 'UPPER',
            status: 'AVAILABLE',
          },
        });
      }
      console.log(`Created room ${plan.roomNumber} with ${plan.beds.length} beds`);
    }
  }

  console.log(`\nDone. Hotel URL: /${slug}   Owner: ${ownerEmail}`);
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
