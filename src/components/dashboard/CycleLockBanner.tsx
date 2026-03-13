import React from 'react';
import { Lock, CalendarClock } from 'lucide-react';

interface CycleLockBannerProps {
    cycleName?: string;
}

/**
 * CycleLockBanner — shown on faculty submission pages when all appraisal cycles are closed.
 * Replaces the submit form with a clear message.
 */
const CycleLockBanner: React.FC<CycleLockBannerProps> = ({ cycleName }) => (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4 rounded-2xl border-2 border-dashed border-destructive/30 bg-destructive/5 my-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-destructive" />
        </div>
        <div>
            <h3 className="font-bold text-lg text-destructive mb-1">Submissions Closed</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
                The appraisal submission window is currently <strong>closed</strong>.
                {cycleName
                    ? ` The cycle "${cycleName}" is no longer accepting new entries.`
                    : ' No active appraisal cycle is open at this time.'
                }
            </p>
            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <CalendarClock className="w-3.5 h-3.5" />
                Please contact your administrator to open the next submission window.
            </p>
        </div>
    </div>
);

export default CycleLockBanner;
