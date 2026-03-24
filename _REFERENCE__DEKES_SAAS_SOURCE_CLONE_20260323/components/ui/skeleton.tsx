import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  lines?: number
  animate?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1,
  animate = true
}) => {
  const baseClasses = 'bg-slate-700'
  const animationClass = animate ? 'animate-pulse' : ''
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg'
  }

  const style = {
    width: width || (variant === 'text' ? '100%' : '40px'),
    height: height || (variant === 'text' ? '1rem' : '40px')
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[...Array(lines)].map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]} ${animationClass}`}
            style={{
              ...style,
              width: index === lines - 1 ? '70%' : '100%' // Last line shorter
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClass} ${className}`}
      style={style}
    />
  )
}

// Card skeleton for dashboard metrics
export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="text" width={60} height={20} />
      </div>
      <Skeleton variant="text" height={32} className="mb-2" />
      <Skeleton variant="text" width={80} height={16} />
    </div>
  )
}

// Table row skeleton
export const TableRowSkeleton: React.FC<{ cells?: number }> = ({ cells = 4 }) => {
  return (
    <div className="flex items-center gap-4 p-3 border-b border-slate-800/50">
      {[...Array(cells)].map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === 0 ? '40%' : '20%'}
          height={16}
          className="flex-1"
        />
      ))}
    </div>
  )
}

// List item skeleton
export const ListItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
      <Skeleton variant="rectangular" width={80} height={24} className="rounded-full" />
    </div>
  )
}

// Dashboard grid skeleton
export const DashboardGridSkeleton: React.FC<{ items?: number }> = ({ items = 4 }) => {
  return (
    <div className="grid md:grid-cols-4 gap-6 mb-12">
      {[...Array(items)].map((_, index) => (
        <MetricCardSkeleton key={index} />
      ))}
    </div>
  )
}

// Panel skeleton for sections
export const PanelSkeleton: React.FC<{
  showHeader?: boolean
  showItems?: boolean
  itemCount?: number
}> = ({ showHeader = true, showItems = true, itemCount = 3 }) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      {showHeader && (
        <div className="mb-6">
          <Skeleton variant="text" width={200} height={24} className="mb-2" />
          <Skeleton variant="text" width={300} height={16} />
        </div>
      )}
      
      {showItems && (
        <div className="space-y-3">
          {[...Array(itemCount)].map((_, index) => (
            <ListItemSkeleton key={index} />
          ))}
        </div>
      )}
    </div>
  )
}

// Loading spinner component
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  className?: string
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400 ${sizeClasses[size]} ${className}`} />
  )
}

// Full page loading state
export const FullPageLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
      <LoadingSpinner size="lg" className="mb-4" />
      <p className="text-slate-400">{message}</p>
    </div>
  )
}

// Inline loading state for buttons
export const ButtonLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size="sm" />
      <span>{text}</span>
    </div>
  )
}

// Table loading skeleton
export const TableSkeleton: React.FC<{
  rows?: number
  columns?: number
  showHeader?: boolean
}> = ({ rows = 5, columns = 4, showHeader = true }) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      {showHeader && (
        <div className="flex gap-4 pb-3 mb-3 border-b border-slate-800">
          {[...Array(columns)].map((_, index) => (
            <Skeleton
              key={index}
              variant="text"
              width={index === 0 ? '30%' : '20%'}
              height={16}
              className="flex-1"
            />
          ))}
        </div>
      )}
      
      <div className="space-y-1 divide-y divide-slate-800/50">
        {[...Array(rows)].map((_, index) => (
          <TableRowSkeleton key={index} cells={columns} />
        ))}
      </div>
    </div>
  )
}
