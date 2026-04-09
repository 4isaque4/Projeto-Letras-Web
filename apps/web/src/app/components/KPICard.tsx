import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  subtitle?: string;
}

export default function KPICard({ title, value, icon: Icon, subtitle }: KPICardProps) {
  return (
    <div className="border border-gray-300 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-2">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 border border-gray-300 bg-gray-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </div>
    </div>
  );
}
