-- There is exactly one platform administrator (the ROOST owner). The database refuses a second one.
CREATE UNIQUE INDEX "uq_single_platform_admin" ON "users" ((1)) WHERE "role" = 'PLATFORM_ADMIN';
