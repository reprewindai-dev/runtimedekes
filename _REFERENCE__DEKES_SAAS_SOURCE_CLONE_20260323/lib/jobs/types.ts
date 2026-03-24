export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type JobHandler = () => Promise<JobResult>

export type JobResult = {
  success: boolean
  processed?: number
  meta?: JsonValue
}

export type ScheduledJob = {
  id: string
  description: string
  cron: string
  handler: JobHandler
}
