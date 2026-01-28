import { Calendar, CalendarDays, Users } from 'lucide-react';

export default function StatsCards({ stats }) {
  const cards = [
    {
      title: 'Ingresos Hoy',
      value: stats.today,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Últimos 7 días',
      value: stats.week,
      icon: CalendarDays,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Total Registros',
      value: stats.total,
      icon: Users,
      color: 'text-[#156082]',
      bgColor: 'bg-[#156082]/5',
      borderColor: 'border-[#156082]/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <div
            key={index}
            className={`
              bg-white rounded-lg border ${card.borderColor} p-5
              shadow-sm hover:shadow-md transition-shadow duration-200
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {card.title}
                </p>
                <p className={`text-3xl font-bold mt-1 ${card.color}`}>
                  {card.value.toLocaleString('es-CL')}
                </p>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
