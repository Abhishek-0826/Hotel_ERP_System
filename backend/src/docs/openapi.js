'use strict';

/*
 * Express does not have decorators, so this catalogue is the single source of
 * truth for its OpenAPI output. `scripts/generate-openapi.js` materialises it
 * as swagger.json for CI/release artifacts; the server uses this module at
 * runtime so it cannot become stale after a generation step is missed.
 */
const success = (schema = { type: 'object' }) => ({
  type: 'object', required: ['success', 'data'], properties: {
    success: { type: 'boolean', example: true }, data: schema,
  },
});

const error = {
  type: 'object', required: ['success', 'message', 'code', 'errors'], properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: 'Validation failed' },
    code: { type: 'string', example: 'VALIDATION_ERROR' },
    errors: { type: 'object', additionalProperties: { type: 'string' }, example: { email: 'Invalid email address' } },
  },
};

const list = (item) => ({
  type: 'object', required: ['items', 'page', 'pageSize', 'totalItems', 'totalPages'], properties: {
    items: { type: 'array', items: item }, page: { type: 'integer', example: 1 },
    pageSize: { type: 'integer', example: 10 }, totalItems: { type: 'integer', example: 16 }, totalPages: { type: 'integer', example: 2 },
  },
});

const schemas = {
  Error: error,
  ListEnvelope: list({ type: 'object' }),
  User: { type: 'object', required: ['id', 'name', 'email', 'role', 'status'], properties: {
    id: { type: 'string', example: '42' }, name: { type: 'string', example: 'Guest One' },
    email: { type: 'string', format: 'email', example: 'fixture.guest01@roost.test' }, phone: { type: 'string', nullable: true, example: '9000000101' },
    role: { type: 'string', enum: ['GUEST', 'OWNER', 'STAFF', 'MANAGER', 'RECEPTIONIST', 'PLATFORM_ADMIN'] },
    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] }, tenantId: { type: 'string', nullable: true, example: '1' },
  } },
  Property: { type: 'object', required: ['id', 'tenantId', 'slug', 'name', 'type', 'genderPolicy', 'amenities', 'price', 'startingPrice', 'rating', 'reviews', 'roomsCount', 'bedsCount', 'availableBeds', 'featured', 'status'], properties: {
    id: { type: 'string', example: '101' }, tenantId: { type: 'string', example: '1' }, slug: { type: 'string', example: 'roost-fixture-1' },
    name: { type: 'string', example: 'ROOST Fixture Residence 1' }, city: { type: 'string', nullable: true, example: 'Pune' }, area: { type: 'string', nullable: true, example: 'Hinjewadi' },
    address: { type: 'string', nullable: true }, state: { type: 'string', nullable: true }, description: { type: 'string', nullable: true },
    type: { type: 'string', enum: ['PG', 'HOSTEL', 'CO_LIVING', 'DORMITORY'] }, genderPolicy: { type: 'string', enum: ['MIXED', 'MALE', 'FEMALE'] },
    amenities: { type: 'array', items: { type: 'string' }, example: ['Wi-Fi', 'Laundry', 'CCTV'] }, price: { type: 'number', example: 6750 }, startingPrice: { type: 'number', example: 6500 },
    rating: { type: 'number', example: 4.2 }, reviews: { type: 'integer', example: 24 }, roomsCount: { type: 'integer', example: 4 }, bedsCount: { type: 'integer', example: 8 }, availableBeds: { type: 'integer', example: 5 }, featured: { type: 'boolean' },
    status: { type: 'string', enum: ['PUBLISHED', 'DRAFT', 'ACTIVE'] },
  } },
  Room: { type: 'object', required: ['id', 'propertyId', 'roomNumber', 'type', 'genderPolicy', 'hasAc', 'hasAttachedBathroom', 'basePrice', 'bedsCount', 'availableBeds', 'status'], properties: {
    id: { type: 'string', example: '201' }, propertyId: { type: 'string', example: '101' }, roomNumber: { type: 'string', example: 'R-001' }, type: { type: 'string', enum: ['AC', 'Non-AC'] }, genderPolicy: { type: 'string', enum: ['MIXED', 'MALE', 'FEMALE'] }, hasAc: { type: 'boolean' }, hasAttachedBathroom: { type: 'boolean' }, basePrice: { type: 'number', example: 6500 }, bedsCount: { type: 'integer', example: 2 }, availableBeds: { type: 'integer', example: 1 }, status: { type: 'string', example: 'ACTIVE' },
  } },
  Bed: { type: 'object', required: ['id', 'roomId', 'bedCode', 'position', 'status'], properties: {
    id: { type: 'string', example: '301' }, roomId: { type: 'string', example: '201' }, bedCode: { type: 'string', example: 'B-UPPER' }, position: { type: 'string', enum: ['UPPER', 'LOWER', 'SINGLE'] }, priceOverride: { type: 'number', nullable: true, example: 6750 }, status: { type: 'string', enum: ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE'] },
  } },
  Booking: { type: 'object', required: ['bookingCode', 'propertyId', 'bedId', 'checkIn', 'checkOut', 'nights', 'price', 'totalAmount', 'guest', 'status'], properties: {
    id: { type: 'string', example: '401' }, bookingCode: { type: 'string', example: 'FIX-BKG-001' }, propertyId: { type: 'string', example: '101' }, bedId: { type: 'string', example: '301' }, checkIn: { type: 'string', format: 'date', example: '2026-10-02' }, checkOut: { type: 'string', format: 'date', example: '2026-10-05' }, nights: { type: 'integer', example: 3 }, price: { type: 'number', example: 6500 }, totalAmount: { type: 'number', example: 19500 }, guest: { $ref: '#/components/schemas/GuestContact' }, status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'CHECKED_IN', 'CHECKED_OUT'] },
  } },
  GuestContact: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string', format: 'email', nullable: true }, phone: { type: 'string', nullable: true } } },
  Guest: { type: 'object', required: ['id', 'name', 'email', 'gender', 'status', 'joined'], properties: {
    id: { type: 'string', example: '42' }, name: { type: 'string', example: 'Guest One' }, phone: { type: 'string', nullable: true }, email: { type: 'string', format: 'email' }, gender: { type: 'string', enum: ['Male', 'Female', 'Other'] }, address: { type: 'string', nullable: true }, status: { type: 'string', enum: ['IN_HOUSE', 'RESERVED', 'CHECKED_OUT'] }, joined: { type: 'string', format: 'date-time' }, room: { type: 'string', nullable: true }, idProofType: { type: 'string', enum: ['AADHAR', 'PAN'], nullable: true }, idProofNumber: { type: 'string', nullable: true }, idProofPhotoUrl: { type: 'string', format: 'uri', nullable: true },
  } },
  Payment: { type: 'object', required: ['id', 'bookingId', 'amount', 'method', 'status'], properties: {
    id: { type: 'string', example: '501' }, guestId: { type: 'string', nullable: true }, bookingId: { type: 'string', example: '401' }, amount: { type: 'number', example: 6510 }, method: { type: 'string', enum: ['UPI', 'CARD', 'NET_BANKING', 'COD'] }, date: { type: 'string', format: 'date-time' }, paidAt: { type: 'string', format: 'date-time', nullable: true }, status: { type: 'string', enum: ['PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'PAY_AT_PROPERTY'] },
  } },
  Invoice: { type: 'object', properties: { id: { type: 'string' }, invoiceNumber: { type: 'string', example: 'FIX-INV-001' }, bookingId: { type: 'string' }, paymentId: { type: 'string', nullable: true }, guest: { $ref: '#/components/schemas/GuestContact' }, amount: { type: 'number' }, date: { type: 'string', format: 'date-time' }, status: { type: 'string' } } },
  Refund: { type: 'object', properties: { id: { type: 'string' }, guestId: { type: 'string', nullable: true }, bookingId: { type: 'string' }, amount: { type: 'number' }, reason: { type: 'string' }, date: { type: 'string', format: 'date-time' }, status: { type: 'string', enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'] } } },
  Staff: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, role: { type: 'string', enum: ['STAFF', 'MANAGER', 'RECEPTIONIST'] }, phone: { type: 'string', nullable: true }, email: { type: 'string', format: 'email' }, department: { type: 'string', nullable: true }, joiningDate: { type: 'string', format: 'date', nullable: true }, status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } } },
  Inventory: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, category: { type: 'string' }, stock: { type: 'number' }, minStock: { type: 'number' }, unit: { type: 'string' }, status: { type: 'string', enum: ['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK'] } } },
  Complaint: { type: 'object', properties: { id: { type: 'string' }, guestId: { type: 'string' }, subject: { type: 'string' }, priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }, status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] }, date: { type: 'string', format: 'date-time' }, createdBy: { type: 'string' } } },
  Feedback: { type: 'object', properties: { id: { type: 'string' }, guestId: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string', nullable: true }, date: { type: 'string', format: 'date-time' }, createdBy: { type: 'string' } } },
  Notification: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' }, time: { type: 'string', format: 'date-time' }, unread: { type: 'boolean' }, type: { type: 'string' } } },
};

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const genericBody = { content: { 'application/json': { schema: { type: 'object' } } } };
const responses = (result, created = false, accepted = false) => ({
  [accepted ? '202' : created ? '201' : '200']: { description: accepted ? 'Accepted' : created ? 'Created' : 'Success', content: { 'application/json': { schema: success(result) } } },
  400: { description: 'Validation error', content: { 'application/json': { schema: ref('Error') } } },
  401: { description: 'Bearer token missing, invalid, or inactive', content: { 'application/json': { schema: ref('Error') } } },
  403: { description: 'Role or permission denied', content: { 'application/json': { schema: ref('Error') } } },
  404: { description: 'Resource not found', content: { 'application/json': { schema: ref('Error') } } },
  409: { description: 'Conflict', content: { 'application/json': { schema: ref('Error') } } },
});

const pathParameter = (name) => ({ name, in: 'path', required: true, schema: { type: 'string' } });
const op = ({ tag, summary, secure = true, roles, request, result, created = false, accepted = false, parameters = [] }) => ({
  tags: [tag], summary, ...(secure ? { security: [{ bearerAuth: [] }], 'x-required-roles': roles || ['authenticated'] } : {}),
  parameters, ...(request ? { requestBody: request === true ? genericBody : { content: { 'application/json': { schema: request } } } } : {}), responses: responses(result || { type: 'object' }, created, accepted),
});

const paths = {};
const add = (path, method, config) => {
  const declared = config.parameters || [];
  const declaredNames = new Set(declared.filter((parameter) => parameter.in === 'path').map((parameter) => parameter.name));
  const inferred = [...path.matchAll(/\{([^}]+)\}/g)]
    .map((match) => match[1])
    .filter((name) => !declaredNames.has(name))
    .map(pathParameter);
  paths[path] ||= {};
  paths[path][method] = op({ ...config, parameters: [...declared, ...inferred] });
};
const itemPath = (path, name) => [pathParameter(name)];

// Auth and public discovery
add('/health', 'get', { tag: 'System', summary: 'Health check', secure: false, result: { type: 'object' } });
add('/auth/register', 'post', { tag: 'Auth', summary: 'Register guest', secure: false, request: ref('User'), result: ref('User'), created: true });
add('/auth/login', 'post', { tag: 'Auth', summary: 'Login', secure: false, request: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } }, result: { type: 'object', properties: { user: ref('User'), token: { type: 'string' } } } });
add('/auth/admin/login', 'post', { tag: 'Auth', summary: 'Platform administrator login', secure: false, request: true, result: { type: 'object' } });
add('/auth/forgot-password', 'post', { tag: 'Auth', summary: 'Start password reset', secure: false, request: true, result: { type: 'object' } });
add('/auth/me', 'get', { tag: 'Auth', summary: 'Get current profile', result: ref('User') });
add('/auth/me', 'patch', { tag: 'Auth', summary: 'Update current profile', request: ref('User'), result: ref('User') });
add('/auth/change-password', 'post', { tag: 'Auth', summary: 'Change password', request: true, result: { type: 'object' } });

add('/properties', 'get', { tag: 'Properties', summary: 'Search published properties', secure: false, result: list(ref('Property')), parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } }, { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50 } }, { name: 'city', in: 'query', schema: { type: 'string' } }, { name: 'state', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }] });
add('/properties', 'post', { tag: 'Properties', summary: 'Create property', roles: ['OWNER', 'STAFF', 'PLATFORM_ADMIN'], request: ref('Property'), result: ref('Property'), created: true });
add('/properties/mine', 'get', { tag: 'Properties', summary: 'List caller tenant properties', roles: ['OWNER', 'STAFF'], result: { type: 'array', items: ref('Property') } });
add('/properties/{slug}', 'get', { tag: 'Properties', summary: 'Get published property by slug', secure: false, result: ref('Property'), parameters: itemPath('/properties/{slug}', 'slug') });
add('/properties/{slug}/availability', 'get', { tag: 'Properties', summary: 'Get date-range bed availability', secure: false, result: { type: 'object', properties: { rooms: { type: 'array', items: ref('Room') } } }, parameters: [...itemPath('', 'slug'), { name: 'checkIn', in: 'query', required: true, schema: { type: 'string', format: 'date' } }, { name: 'checkOut', in: 'query', required: true, schema: { type: 'string', format: 'date' } }] });
['patch', 'delete'].forEach((method) => add('/properties/{propertyId}', method, { tag: 'Properties', summary: `${method === 'patch' ? 'Update' : 'Delete'} property`, roles: ['OWNER', 'PLATFORM_ADMIN'], request: method === 'patch' ? ref('Property') : undefined, result: ref('Property'), parameters: itemPath('', 'propertyId') }));
add('/properties/{propertyId}/status', 'patch', { tag: 'Properties', summary: 'Change property status', roles: ['OWNER', 'PLATFORM_ADMIN'], request: true, result: ref('Property'), parameters: itemPath('', 'propertyId') });
add('/properties/{propertyId}/rooms', 'get', { tag: 'Rooms/Beds', summary: 'List property rooms', roles: ['OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF', 'PLATFORM_ADMIN'], result: { type: 'array', items: ref('Room') }, parameters: itemPath('', 'propertyId') });
add('/properties/{propertyId}/rooms', 'post', { tag: 'Rooms/Beds', summary: 'Create room', roles: ['OWNER', 'PLATFORM_ADMIN'], request: ref('Room'), result: ref('Room'), created: true, parameters: itemPath('', 'propertyId') });
add('/rooms/{roomId}', 'patch', { tag: 'Rooms/Beds', summary: 'Update room', roles: ['OWNER', 'PLATFORM_ADMIN'], request: ref('Room'), result: ref('Room'), parameters: itemPath('', 'roomId') });
add('/rooms/{roomId}/beds', 'get', { tag: 'Rooms/Beds', summary: 'List room beds', roles: ['OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF', 'PLATFORM_ADMIN'], result: { type: 'array', items: ref('Bed') }, parameters: itemPath('', 'roomId') });
add('/rooms/{roomId}/beds', 'post', { tag: 'Rooms/Beds', summary: 'Create bed', roles: ['OWNER', 'PLATFORM_ADMIN'], request: ref('Bed'), result: ref('Bed'), created: true, parameters: itemPath('', 'roomId') });
add('/beds/{bedId}', 'patch', { tag: 'Rooms/Beds', summary: 'Update bed', roles: ['OWNER', 'PLATFORM_ADMIN'], request: ref('Bed'), result: ref('Bed'), parameters: itemPath('', 'bedId') });

// Booking and finance routes.
add('/bookings', 'post', { tag: 'Bookings', summary: 'Create public booking (JSON only; no ID-proof upload yet)', secure: false, request: ref('Booking'), result: ref('Booking'), created: true });
add('/bookings', 'get', { tag: 'Bookings', summary: 'List tenant bookings', roles: ['OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF', 'PLATFORM_ADMIN'], result: list(ref('Booking')) });
add('/bookings/owner', 'get', { tag: 'Bookings', summary: 'List tenant bookings', roles: ['OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF', 'PLATFORM_ADMIN'], result: list(ref('Booking')) });
add('/bookings/mine', 'get', { tag: 'Bookings', summary: 'List the authenticated guest bookings', roles: ['GUEST'], result: list(ref('Booking')) });
add('/bookings/{code}', 'get', { tag: 'Bookings', summary: 'Get booking by code', secure: false, result: ref('Booking'), parameters: itemPath('', 'code') });
add('/bookings/{code}/cancel', 'patch', { tag: 'Bookings', summary: 'Cancel booking', secure: false, request: true, result: ref('Booking'), parameters: itemPath('', 'code') });
['approve', 'confirm', 'reject'].forEach((action) => add(`/bookings/{code}/${action}`, 'patch', { tag: 'Bookings', summary: `${action} booking`, roles: ['OWNER', 'STAFF', 'PLATFORM_ADMIN'], request: action === 'reject' ? true : undefined, result: ref('Booking'), parameters: itemPath('', 'code') }));
add('/analytics/owner-summary', 'get', { tag: 'Analytics', summary: 'Owner summary', roles: ['OWNER', 'STAFF'], result: { type: 'object' } });
['dashboard', 'occupancy', 'revenue', 'bookings'].forEach((name) => add(`/analytics/${name}`, 'get', { tag: 'Analytics', summary: `${name[0].toUpperCase()}${name.slice(1)} analytics`, roles: ['reports:read'], result: { type: 'object' } }));

const methods = (base, tag, configs) => configs.forEach(([method, suffix, summary, request, result, roles]) => add(`${base}${suffix}`, method, { tag, summary, request, result, roles, created: method === 'post' }));
methods('/reception', 'Guests', [
  ['post', '/guests', 'Register guest', ref('Guest'), ref('Guest')], ['get', '/guests', 'Search guests', undefined, { type: 'array', items: ref('Guest') }],
  ['get', '/properties/{propertyId}/availability', 'Reception availability', undefined, { type: 'array', items: ref('Room') }], ['post', '/bookings', 'Create reception booking', ref('Booking'), ref('Booking')], ['patch', '/bookings/{bookingCode}/check-in', 'Check in booking', undefined, ref('Booking')], ['patch', '/bookings/{bookingCode}/check-out', 'Check out booking', undefined, ref('Booking')],
]);
methods('/finance', 'Payments', [
  ['post', '/payments', 'Collect payment', ref('Payment'), ref('Payment')], ['get', '/payments', 'List payments', undefined, { type: 'array', items: ref('Payment') }], ['get', '/invoices/{invoiceNumber}', 'Get invoice', undefined, ref('Invoice')], ['post', '/refunds', 'Request refund', ref('Refund'), ref('Refund')], ['patch', '/refunds/{refundId}/decision', 'Approve or reject refund', true, ref('Refund')],
]);
methods('/management', 'Users', [
  ['post', '/users', 'Create tenant user', ref('User'), ref('User')], ['get', '/users', 'List tenant users', undefined, { type: 'array', items: ref('User') }], ['patch', '/users/{userId}/status', 'Change user status', true, ref('User')], ['post', '/users/{userId}/reset-password', 'Reset user password (returns a temporary password once)', true, { type: 'object' }], ['delete', '/users/{userId}', 'Delete user', undefined, { type: 'object' }], ['post', '/inventory/items', 'Create inventory item', ref('Inventory'), ref('Inventory')], ['get', '/inventory/items', 'List inventory items', undefined, { type: 'array', items: ref('Inventory') }], ['post', '/inventory/items/{itemId}/check', 'Adjust inventory', true, ref('Inventory')], ['get', '/inventory/items/{itemId}/history', 'Inventory history', undefined, { type: 'array', items: { type: 'object' } }],
]);
methods('/roost/users', 'Users', [
  ['get', '', 'List platform users', undefined, { type: 'array', items: ref('User') }, ['PLATFORM_ADMIN']], ['post', '', 'Create platform user', ref('User'), ref('User'), ['PLATFORM_ADMIN']], ['patch', '/{userId}', 'Update platform user', ref('User'), ref('User'), ['PLATFORM_ADMIN']], ['post', '/{userId}/reset-password', 'Reset platform user password', true, { type: 'object' }, ['PLATFORM_ADMIN']], ['delete', '/{userId}', 'Delete platform user', undefined, { type: 'object' }, ['PLATFORM_ADMIN']], ['patch', '/{userId}/activate', 'Activate platform user', undefined, ref('User'), ['PLATFORM_ADMIN']], ['patch', '/{userId}/deactivate', 'Deactivate platform user', undefined, ref('User'), ['PLATFORM_ADMIN']],
]);
methods('/experience', 'Feedback', [
  ['post', '/feedback', 'Create feedback', ref('Feedback'), ref('Feedback')], ['get', '/feedback/analysis', 'Feedback analysis', undefined, { type: 'object' }], ['post', '/complaints', 'Create complaint', ref('Complaint'), ref('Complaint')], ['get', '/complaints/mine', 'List authenticated guest complaints', undefined, { type: 'array', items: ref('Complaint') }, ['GUEST']], ['get', '/complaints', 'List complaints', undefined, { type: 'array', items: ref('Complaint') }], ['patch', '/complaints/{complaintId}', 'Update complaint', ref('Complaint'), ref('Complaint')],
]);

const reportRoutes = [['/dashboard', 'Dashboard report'], ['/occupancy', 'Occupancy report'], ['/revenue', 'Revenue report'], ['/guests', 'Guest report'], ['/bookings', 'Booking report'], ['/payments', 'Payment report'], ['/inventory', 'Inventory report'], ['/staff-performance', 'Staff performance report'], ['/staff', 'Staff report'], ['/complaints', 'Complaint report'], ['/feedback', 'Feedback report'], ['/bi/weekly', 'Weekly BI report'], ['/bi/monthly', 'Monthly BI report']];
['/reports', '/roost/reports'].forEach((base) => reportRoutes.forEach(([suffix, summary]) => add(`${base}${suffix}`, 'get', { tag: 'Reports', summary, roles: ['reports:read'], result: { type: 'object' } })));
methods('/system', 'System', [
  ['get', '/access-control', 'Get access control', undefined, { type: 'object' }], ['get', '/settings', 'Get settings', undefined, { type: 'object' }], ['put', '/settings', 'Update settings', true, { type: 'object' }], ['patch', '/settings', 'Update settings', true, { type: 'object' }], ['get', '/camera', 'Get camera configuration', undefined, { type: 'object' }], ['put', '/camera', 'Update camera configuration', true, { type: 'object' }], ['get', '/backup', 'Get backup information', undefined, { type: 'object' }], ['get', '/audit-logs', 'List audit logs', undefined, list({ type: 'object' })],
]);
add('/system/restore', 'post', { tag: 'System', summary: 'Request restore for operator review', request: true, result: { type: 'object' }, accepted: true });
['get', 'post', 'patch', 'delete'].forEach((method) => add(`/roost/cameras${method === 'get' || method === 'post' ? '' : '/{cameraId}'}`, method, { tag: 'System', summary: `${method.toUpperCase()} camera`, roles: ['PLATFORM_ADMIN'], request: ['post', 'patch'].includes(method) ? true : undefined, result: { type: 'object' } }));

// Frontend-facing /roost namespace.
methods('/roost', 'Guests', [
  ['get', '/guests', 'List guests', undefined, { type: 'array', items: ref('Guest') }], ['get', '/guests/{id}', 'Get guest', undefined, ref('Guest')], ['post', '/guests', 'Create guest', ref('Guest'), ref('Guest')], ['patch', '/guests/{id}', 'Update guest', ref('Guest'), ref('Guest')],
]);
methods('/roost', 'Bookings', [
  ['get', '/bookings', 'List operations bookings', undefined, { type: 'array', items: ref('Booking') }], ['post', '/bookings', 'Create operations booking', ref('Booking'), ref('Booking')], ['patch', '/bookings/{code}/check-in', 'Check in operations booking', undefined, ref('Booking')], ['patch', '/bookings/{code}/check-out', 'Check out operations booking', undefined, ref('Booking')], ['patch', '/bookings/{code}/cancel', 'Cancel operations booking', true, ref('Booking')], ['get', '/beds', 'List beds', undefined, { type: 'array', items: ref('Bed') }], ['get', '/beds/availability', 'List available beds', undefined, { type: 'array', items: ref('Bed') }],
]);
methods('/roost', 'Payments', [
  ['get', '/payments', 'List payments', undefined, { type: 'array', items: ref('Payment') }], ['get', '/payments/{id}', 'Get payment', undefined, ref('Payment')], ['get', '/invoices', 'List invoices', undefined, { type: 'array', items: ref('Invoice') }], ['get', '/invoices/{bookingId}', 'Get invoice by booking', undefined, ref('Invoice')], ['get', '/refunds', 'List refunds', undefined, { type: 'array', items: ref('Refund') }], ['post', '/refunds', 'Create refund', ref('Refund'), ref('Refund')], ['patch', '/refunds/{id}/approve', 'Approve refund', undefined, ref('Refund')], ['patch', '/refunds/{id}/reject', 'Reject refund', undefined, ref('Refund')],
]);
methods('/roost', 'Complaints', [
  ['get', '/complaints', 'List complaints', undefined, { type: 'array', items: ref('Complaint') }], ['post', '/complaints', 'Create complaint', ref('Complaint'), ref('Complaint')], ['patch', '/complaints/{id}', 'Update complaint', ref('Complaint')], ['get', '/feedback', 'List feedback', undefined, { type: 'array', items: ref('Feedback') }], ['post', '/feedback', 'Create feedback', ref('Feedback'), ref('Feedback')], ['get', '/feedback/summary', 'Feedback summary', undefined, { type: 'object' }],
]);
methods('/roost', 'Staff', [
  ['get', '/staff', 'List staff', undefined, { type: 'array', items: ref('Staff') }], ['post', '/staff', 'Create staff', ref('Staff'), ref('Staff')], ['patch', '/staff/{id}', 'Update staff', ref('Staff'), ref('Staff')], ['get', '/staff/performance', 'Staff performance', undefined, { type: 'array', items: { type: 'object' } }],
]);
methods('/roost', 'Inventory', [
  ['get', '/inventory', 'List inventory', undefined, { type: 'array', items: ref('Inventory') }], ['post', '/inventory', 'Create inventory item', ref('Inventory'), ref('Inventory')], ['patch', '/inventory/{itemId}', 'Update inventory item', ref('Inventory'), ref('Inventory')], ['delete', '/inventory/{itemId}', 'Delete inventory item', undefined, { type: 'object' }], ['get', '/inventory/summary', 'Inventory summary', undefined, { type: 'object' }],
]);
methods('/roost', 'Analytics', [
  ['get', '/analytics/dashboard', 'Operations dashboard', undefined, { type: 'object' }], ['get', '/analytics/weekly', 'Weekly analytics', undefined, { type: 'object' }], ['get', '/analytics/monthly', 'Monthly analytics', undefined, { type: 'object' }], ['get', '/analytics/bi', 'Business intelligence analytics', undefined, { type: 'object' }],
]);
methods('/roost', 'Settings', [
  ['get', '/settings', 'Get tenant settings', undefined, { type: 'object' }], ['patch', '/settings', 'Update tenant settings', true, { type: 'object' }], ['get', '/access-control/permissions', 'Get permission map', undefined, { type: 'object' }, ['PLATFORM_ADMIN']], ['patch', '/access-control/permissions', 'Update permission map', true, { type: 'object' }, ['PLATFORM_ADMIN']], ['get', '/audit-logs', 'List audit logs', undefined, list({ type: 'object' })],
]);

module.exports = {
  openapi: '3.0.3',
  info: { title: 'ROOST API', version: '1.0.0', description: 'Generated from the Express route catalogue. Only routes registered in source are listed.' },
  servers: [{ url: '/api/v1', description: 'Current API base path' }],
  tags: ['Auth', 'Properties', 'Rooms/Beds', 'Bookings', 'Payments', 'Invoices', 'Refunds', 'Guests', 'Staff', 'Inventory', 'Complaints', 'Feedback', 'Users', 'Analytics', 'Reports', 'Settings', 'System'].map((name) => ({ name })),
  paths,
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas },
};
