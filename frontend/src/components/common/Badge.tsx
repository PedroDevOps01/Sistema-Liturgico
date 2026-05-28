interface BadgeProps {
  children: React.ReactNode
  variant?: 'wine' | 'gold' | 'green' | 'blue' | 'red' | 'gray' | 'purple' | 'orange'
  size?: 'sm' | 'md'
}

const variantClasses = {
  wine: 'bg-wine-900 text-white',
  gold: 'bg-gold-500 text-black',
  green: 'bg-green-100 text-green-800 border border-green-200',
  blue: 'bg-blue-100 text-blue-800 border border-blue-200',
  red: 'bg-red-100 text-red-800 border border-red-200',
  gray: 'bg-gray-100 text-gray-700 border border-gray-200',
  purple: 'bg-purple-100 text-purple-800 border border-purple-200',
  orange: 'bg-orange-100 text-orange-800 border border-orange-200',
}

export default function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
