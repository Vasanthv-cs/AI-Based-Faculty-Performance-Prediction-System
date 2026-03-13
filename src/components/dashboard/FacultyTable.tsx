import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import UserAvatar from '@/components/common/UserAvatar';

interface FacultyMember {
  id: string;
  name: string;
  email: string;
  department: string;
  score: number;
  category: string;
  trend: 'up' | 'down' | 'stable';
  avatarUrl?: string | null;
}

interface FacultyTableProps {
  faculty: FacultyMember[];
  onRowClick?: (facultyId: string) => void;
}

const FacultyTable: React.FC<FacultyTableProps> = ({ faculty, onRowClick }) => {
  const getCategoryBadge = (category: string) => {
    const styles = {
      'Excellent': 'bg-success/10 text-success',
      'Good': 'bg-primary/10 text-primary',
      'Average': 'bg-warning/10 text-warning',
      'Needs Improvement': 'bg-destructive/10 text-destructive',
    };
    return styles[category as keyof typeof styles] || 'bg-muted text-muted-foreground';
  };

  const TrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="dashboard-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Faculty</TableHead>
              <TableHead className="hidden md:table-cell">Department</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Category</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Trend</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faculty.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No faculty members found
                </TableCell>
              </TableRow>
            ) : (
              faculty.map((member) => (
                <TableRow 
                  key={member.id} 
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => onRowClick?.(member.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        userId={member.id}
                        name={member.name}
                        avatarUrl={member.avatarUrl}
                        className="w-10 h-10"
                      />
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground hidden sm:block">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{member.department}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-display font-bold text-lg">
                      {member.score || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {member.category && member.category !== 'N/A' && (
                      <span className={cn('px-3 py-1 rounded-full text-sm font-medium', getCategoryBadge(member.category))}>
                        {member.category}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {TrendIcon(member.trend)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick?.(member.id);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default FacultyTable;
