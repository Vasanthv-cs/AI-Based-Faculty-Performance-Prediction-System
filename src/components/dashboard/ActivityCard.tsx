import React from 'react';
import { LucideIcon, Plus, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  hasProof?: boolean;
}

interface ActivityCardProps {
  title: string;
  icon: LucideIcon;
  activities: Activity[];
  onAdd?: () => void;
  onView?: (id: string) => void;
  emptyMessage?: string;
  variant?: 'default' | 'primary' | 'accent';
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  title,
  icon: Icon,
  activities,
  onAdd,
  onView,
  emptyMessage = 'No activities yet',
  variant = 'default',
}) => {
  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
  };

  return (
    <div className="dashboard-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconStyles[variant])}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="font-display font-semibold text-lg">{title}</h3>
        </div>
        {onAdd && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              onClick={() => onView?.(activity.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{activity.title}</p>
                <p className="text-sm text-muted-foreground truncate">{activity.subtitle}</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                {activity.hasProof && (
                  <FileText className="w-4 h-4 text-success" />
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {activity.date}
                </div>
              </div>
            </div>
          ))}
          {activities.length > 5 && (
            <Button variant="ghost" className="w-full text-muted-foreground">
              View all {activities.length} items
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityCard;
