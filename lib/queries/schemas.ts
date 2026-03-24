import { z } from 'zod'

export const createQuerySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(280).optional(),
  input: z.string().min(5).max(240),
  market: z.string().min(2).max(12).default('en-US'),
})

export type CreateQueryInput = z.infer<typeof createQuerySchema>
