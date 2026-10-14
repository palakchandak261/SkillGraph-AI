import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number | null;
  color?: 'teal' | 'blue' | 'purple' | 'amber' | 'emerald';
}

const colorMap = {
  teal: { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-100' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
};

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'teal' }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className={`bg-white rounded-xl border ${colors.border} p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`${colors.bg} p-2.5 rounded-lg`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
      </div>
      {trend !== undefined && trend !== null && (
        <div className="flex items-center mt-3 text-sm">
          {trend > 0 ? (
            <>
              <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
              <span className="text-emerald-600 font-medium">+{trend.toFixed(1)}%</span>
            </>
          ) : trend < 0 ? (
            <>
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-red-600 font-medium">{trend.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <Minus className="w-4 h-4 text-slate-400 mr-1" />
              <span className="text-slate-500 font-medium">0%</span>
            </>
          )}
          <span className="text-slate-400 ml-1">vs prev period</span>
        </div>
      )}
    </div>
  );
}
