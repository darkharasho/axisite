import { z } from 'zod';
import { CATEGORIES, STATUSES } from './categories';

export const PLATFORMS = ['windows', 'linux', 'mac', 'web', 'discord'] as const;

export const appSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  category: z.enum(CATEGORIES),
  status: z.enum(STATUSES),
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'repo must be owner/name').optional(),
  site: z.string().url().optional(),
  platforms: z.array(z.enum(PLATFORMS)).optional(),
  icon: z.string().regex(/^[\w.-]+\.(png|svg|webp)$/, 'icon must be a bare filename in public/icons').optional(),
  featured: z.boolean().default(false),
  hidden: z.boolean().default(false),
  aliases: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'alias must be a url slug')).optional(),
  links: z.array(z.object({ label: z.string().min(1), url: z.string().url() })).optional(),
});

export const pageSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  order: z.number().int().default(100),
});

export type App = z.infer<typeof appSchema>;
export type Page = z.infer<typeof pageSchema>;
