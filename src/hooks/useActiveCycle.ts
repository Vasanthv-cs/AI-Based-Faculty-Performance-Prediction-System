import { useState, useEffect } from 'react';

interface CycleStatus {
    isOpen: boolean;       // true if at least one cycle is open
    cycleName: string;     // e.g. "2024-2025 — Odd Semester"
    isLoading: boolean;
}

/**
 * useActiveCycle — checks Supabase for any open appraisal cycle.
 * Returns isOpen=true if submissions are currently allowed.
 * If the table doesn't exist yet, defaults to isOpen=true (safe fallback).
 */
export function useActiveCycle(): CycleStatus {
    const [status, setStatus] = useState<CycleStatus>({
        isOpen: true,       // default open until we know
        cycleName: '',
        isLoading: true,
    });

    useEffect(() => {
        checkCycle();
    }, []);

    const checkCycle = async () => {
        try {
            const { createClient } = await import('@supabase/supabase-js');
            // Use the already-initialized global supabase client
            const { supabase } = await import('@/integrations/supabase/client');

            const { data, error } = await (supabase as any)
                .from('appraisal_cycles')
                .select('academic_year, semester, is_open')
                .eq('is_open', true)
                .limit(1);

            if (error) {
                // Table doesn't exist or RLS issue — allow submissions by default
                setStatus({ isOpen: true, cycleName: '', isLoading: false });
                return;
            }

            if (data && data.length > 0) {
                const cycle = data[0];
                setStatus({
                    isOpen: true,
                    cycleName: `${cycle.academic_year} — ${cycle.semester} Semester`,
                    isLoading: false,
                });
            } else {
                // Check if any cycle exists at all
                const { data: allCycles } = await (supabase as any)
                    .from('appraisal_cycles')
                    .select('id')
                    .limit(1);

                if (!allCycles || allCycles.length === 0) {
                    // No cycles created at all — allow submissions (legacy mode)
                    setStatus({ isOpen: true, cycleName: '', isLoading: false });
                } else {
                    // Cycles exist but all are closed
                    setStatus({ isOpen: false, cycleName: '', isLoading: false });
                }
            }
        } catch {
            // Any unexpected error — allow submissions by default
            setStatus({ isOpen: true, cycleName: '', isLoading: false });
        }
    };

    return status;
}
