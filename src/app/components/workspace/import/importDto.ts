import { z } from 'zod';

const channelEnum = z.enum(['tv', 'digital', 'radio', 'outdoor']);
const statusEnum = z.enum(['draft', 'booked', 'active', 'completed', 'paused']);
const currencyEnum = z.enum(['NOK', 'EUR', 'USD']);
const budgetTypeEnum = z.enum(['gross', 'net']);
const genderEnum = z.enum(['all', 'male', 'female', 'other']);
const contextEnum = z.enum([
  'all',
  'sport',
  'news',
  'entertainment',
  'reality',
  'living',
  'family',
]);

export const importTargetingSchema = z
  .object({
    county: z.string(),
    gender: genderEnum.optional(),
    context: contextEnum.optional(),
  })
  .optional();

export const importFlightSchema = z.object({
  name: z.string(),
  channel: z.union([channelEnum, z.string()]),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  budgetWeight: z.number().optional(),
  targetAudience: z.string().optional(),
});

export const importOrderLineSchema = z.object({
  name: z.string(),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  budgetWeight: z.number().optional(),
  /** Array of strings, or one string split on comma / semicolon / newline. */
  requisitionNumbers: z.union([z.array(z.string()), z.string()]).optional(),
  targeting: importTargetingSchema,
  flights: z.array(importFlightSchema).optional().default([]),
});

export const importCampaignSchema = z.object({
  name: z.string(),
  advertiser: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  status: statusEnum.optional(),
  budget: z
    .object({
      total: z.number().optional(),
      currency: currencyEnum.optional(),
      type: budgetTypeEnum.optional(),
    })
    .optional(),
  notes: z.string().optional().default(''),
  orderLines: z.array(importOrderLineSchema).default([]),
});

export const importRootSchema = z.object({
  campaigns: z.array(importCampaignSchema),
});

export type ImportCampaignDraft = z.infer<typeof importCampaignSchema>;
export type ImportRoot = z.infer<typeof importRootSchema>;
