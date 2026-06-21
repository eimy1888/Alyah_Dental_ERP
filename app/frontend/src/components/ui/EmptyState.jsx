import { clsx } from 'clsx';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center text-center py-16 px-6',
      className
    )}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-gray-400 dark:text-gray-500" />
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
