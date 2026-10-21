'use strict';

const { z } = require('zod');

/**
 * Schema for bulk-updating system settings.
 * Each item in the array represents one key/value pair to upsert.
 */
const updateSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        key     : z.string().min(1, 'Setting key is required'),
        value   : z.string().nullable(),
        category: z.string().optional(),
      })
    )
    .min(1, 'At least one setting is required'),
});

/**
 * Schema for updating camera configuration.
 */
const cameraConfigSchema = z.object({
  enabled          : z.boolean({ required_error: 'enabled is required' }),
  streamUrl        : z.string().url('streamUrl must be a valid URL').optional(),
  recordingEnabled : z.boolean().optional(),
});

module.exports = { updateSettingsSchema, cameraConfigSchema };
