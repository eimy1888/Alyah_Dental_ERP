import { clsx } from 'clsx';

const variants = {
  default:   'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  primary:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  success:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  warning:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  danger:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  info:      'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  purple:    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

export function Badge({ children, variant = 'default', className, dot }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
      variants[variant] ?? variants.default,
      className
    )}>
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full', {
          'bg-gray-500': variant === 'default',
          'bg-blue-500': variant === 'primary',
          'bg-green-500': variant === 'success',
          'bg-amber-500': variant === 'warning',
          'bg-red-500': variant === 'danger',
          'bg-sky-500': variant === 'info',
          'bg-purple-500': variant === 'purple',
        })} />
      )}
      {children}
    </span>
  );
}
