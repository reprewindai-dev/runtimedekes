import { z } from 'zod'
import { DksWorkloadPayloadSchema as SharedDksWorkloadSchema, DksWorkloadResponseSchema as SharedDksWorkloadResponseSchema, CarbonOutcomeSchema } from '../shared-schemas'

/**
 * DKS → CO₂Router Workload Payload Schema
 * Re-exports the shared schema to ensure consistency across repos
 */
export const DksWorkloadPayloadSchema = SharedDksWorkloadSchema
export type DksWorkloadPayload = z.infer<typeof DksWorkloadPayloadSchema>

/**
 * CO₂Router Response Schema for DKS Workloads
 * Re-exports the shared schema
 */
export const DksWorkloadResponseSchema = SharedDksWorkloadResponseSchema
export type DksWorkloadResponse = z.infer<typeof DksWorkloadResponseSchema>

/**
 * DKS Workload Outcome Schema (for reporting actual execution)
 * Extends the shared CarbonOutcomeSchema with DKS-specific sourceApp
 */
export const DksWorkloadOutcomeSchema = CarbonOutcomeSchema.extend({
  sourceApp: z.literal('dks'),
})

export type DksWorkloadOutcome = z.infer<typeof DksWorkloadOutcomeSchema>
