'use client'

import { formatUTMForDisplay, type UTMData } from '@/lib/utm'

interface UTMDisplayProps {
  utmData?: UTMData | null
  compact?: boolean
}

export function UTMDisplay({ utmData, compact = false }: UTMDisplayProps) {
  if (!utmData) {
    return null
  }

  const displayData = formatUTMForDisplay(utmData)

  if (Object.keys(displayData).length === 0) {
    return null
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {Object.entries(displayData).map(([key, value]) => (
          <span 
            key={key} 
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
          >
            {key}: {value}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900">Attribution</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {Object.entries(displayData).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-gray-600">{key}:</span>
            <span className="font-medium text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UTMDisplay
