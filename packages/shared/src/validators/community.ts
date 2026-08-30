import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().trim().min(3).max(60),
  description: z.string().trim().min(10).max(600),
  categorySlug: z.string().min(1),
  city: z.string().trim().max(80).optional(),
  type: z.enum(['OPEN', 'APPROVAL']),
});

export const createPostSchema = z.object({
  groupId: z.string().min(1),
  body: z.string().trim().min(1).max(1200),
  imageKey: z.string().optional(),
  isPrayerRequest: z.boolean().optional(),
});

export const reactSchema = z.object({
  postId: z.string().min(1),
  type: z.enum(['AMEN', 'PRAYING', 'LIKE']),
});

export const createActivitySchema = z.object({
  groupId: z.string().min(1),
  title: z.string().trim().min(3).max(100),
  startsAt: z.coerce.date(),
  place: z.string().trim().max(160).optional(),
});

export const createEventSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  type: z.enum([
    'CULTO_ESPECIAL',
    'VIGILIA',
    'RETIRO',
    'CONCIERTO',
    'CONGRESO',
    'ACTIVIDAD_SOCIAL',
    'SERVICIO_COMUNITARIO',
  ]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  address: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  capacity: z.number().int().positive().optional(),
  costAmount: z.number().nonnegative().optional(),
  costCurrency: z.enum(['DOP', 'USD']).optional(),
  externalUrl: z.string().url().optional(),
  imageKey: z.string().optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(['PROFILE', 'MESSAGE', 'POST', 'EVENT', 'GROUP']),
  targetId: z.string().min(1),
  category: z.enum(['INAPPROPRIATE', 'SCAM', 'FAKE_IDENTITY', 'HARASSMENT', 'MISLEADING', 'UNDERAGE']),
  details: z.string().trim().max(1000).optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
