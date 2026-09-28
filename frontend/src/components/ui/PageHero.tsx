import { type ReactNode } from 'react';

export interface PageHeroStat {
  label: string;
  value: string | number;
}

interface PageHeroProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
  stats?: PageHeroStat[];
}

export function PageHero({ icon, title, subtitle, action, stats }: PageHeroProps) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-text truncate">{title}</h1>
            <p className="text-sm text-secondary mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-surface">
          {stats.map(stat => (
            <div key={stat.label} className="px-4 py-3 sm:px-5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">{stat.label}</p>
              <p className="text-lg font-bold text-text mt-0.5 truncate">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
