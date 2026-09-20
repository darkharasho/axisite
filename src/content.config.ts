import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { appSchema, pageSchema } from './lib/schema';

export const collections = {
  apps: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/apps' }),
    schema: appSchema,
  }),
  pages: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
    schema: pageSchema,
  }),
};
