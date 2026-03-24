import { z } from 'zod'

// ECOBE WorkloadType enum
export const WorkloadTypeSchema = z.enum([
  'lead_generation_batch',
  'enrichment_job', 
  'intent_classification_batch',
  'web_discovery_task'
])

// ECOBE Route Action enum
export const EcobeRouteActionSchema = z.enum(['execute', 'delay', 'reroute'])

// ECOBE Route Request validation
export const EcobeRouteRequestSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required').max(100, 'Organization ID too long'),
  source: z.literal('DEKES'),
  workloadType: WorkloadTypeSchema,
  candidateRegions: z.array(z.string().min(1).max(50)).min(1, 'At least one candidate region is required').max(10, 'Too many candidate regions'),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 24 hours'),
  delayToleranceMinutes: z.number().int().min(0, 'Delay tolerance cannot be negative').max(1440, 'Delay tolerance cannot exceed 24 hours')
})

// ECOBE Complete Request validation
export const EcobeCompleteRequestSchema = z.object({
  decision_id: z.string().min(1, 'Decision ID is required').max(100, 'Decision ID too long'),
  executionRegion: z.string().min(1, 'Execution region is required').max(50, 'Region name too long'),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 24 hours'),
  status: z.enum(['success', 'failed', 'partial'])
})

// ECOBE Optimize Request validation
export const EcobeOptimizeRequestSchema = z.object({
  query: z.object({
    id: z.string().min(1, 'Query ID is required').max(100, 'Query ID too long'),
    query: z.string().min(1, 'Query text is required').max(10000, 'Query text too long'),
    estimatedResults: z.number().int().min(1, 'Estimated results must be at least 1').max(1000000, 'Estimated results too high')
  }),
  carbonBudget: z.number().min(0, 'Carbon budget cannot be negative').max(10000, 'Carbon budget too high'),
  regions: z.array(z.string().min(1).max(50)).min(1, 'At least one region is required').max(10, 'Too many regions')
})

// ECOBE Report Carbon Usage Request validation
export const EcobeReportCarbonUsageRequestSchema = z.object({
  queryId: z.string().min(1, 'Query ID is required').max(100, 'Query ID too long'),
  actualCO2: z.number().min(0, 'Actual CO2 cannot be negative').max(10000, 'CO2 value too high')
})

// Prospect Payload validation
export const EcobeProspectPayloadSchema = z.object({
  organization: z.object({
    name: z.string().min(1, 'Organization name is required').max(200, 'Organization name too long'),
    domain: z.string().url().nullable().optional(),
    sizeLabel: z.string().max(50).nullable().optional(),
    region: z.string().max(50).nullable().optional()
  }),
  intent: z.object({
    score: z.number().min(0, 'Intent score cannot be negative').max(100, 'Intent score too high'),
    reason: z.string().min(1, 'Intent reason is required').max(500, 'Intent reason too long'),
    keywords: z.array(z.string().min(1).max(50)).max(20, 'Too many keywords')
  }),
  contact: z.object({
    name: z.string().max(100).nullable().optional(),
    email: z.string().email().nullable().optional(),
    linkedin: z.string().url().nullable().optional()
  }).optional(),
  source: z.object({
    leadId: z.string().min(1, 'Lead ID is required').max(100, 'Lead ID too long'),
    queryId: z.string().max(100).nullable().optional(),
    runId: z.string().max(100).nullable().optional()
  })
})

// Tenant Payload validation
export const EcobeTenantPayloadSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required').max(200, 'Organization name too long'),
  externalOrgId: z.string().min(1, 'External organization ID is required').max(100, 'External organization ID too long'),
  ownerEmail: z.string().email('Valid email is required'),
  plan: z.string().max(50).optional()
})

// Demo Payload validation
export const EcobeDemoPayloadSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required').max(200, 'Organization name too long'),
  contactEmail: z.string().email('Valid email is required'),
  workloadSummary: z.string().min(1, 'Workload summary is required').max(1000, 'Workload summary too long'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  metadata: z.record(z.unknown()).optional()
})

// Export inferred types
export type EcobeRouteRequest = z.infer<typeof EcobeRouteRequestSchema>
export type EcobeCompleteRequest = z.infer<typeof EcobeCompleteRequestSchema>
export type EcobeOptimizeRequest = z.infer<typeof EcobeOptimizeRequestSchema>
export type EcobeReportCarbonUsageRequest = z.infer<typeof EcobeReportCarbonUsageRequestSchema>
export type EcobeProspectPayload = z.infer<typeof EcobeProspectPayloadSchema>
export type EcobeTenantPayload = z.infer<typeof EcobeTenantPayloadSchema>
export type EcobeDemoPayload = z.infer<typeof EcobeDemoPayloadSchema>

// Validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw new Error(`Validation failed: ${errorMessages}`)
    }
    throw error
  }
}
