import { useState, useEffect } from 'react';

interface CycleStatus {
    isOpen: boolean;        // true if at least one cycle is open
    cycleName: string;      // e.g. "2024-2025 — Odd Semester"
    cycleId: string | null; // UUID of the open cycle, or null
    isLoading: boolean;
}

/**
 * useActiveCycle — checks Supabase for any open appraisal cycle.
 * Returns isOpen=true if submissions are currently allowed.
 * If the table doesn't exist yet, defaults to isOpen=true (safe fallback).
 */
export function useActiveCycle(): CycleStatus {
    const [status, setStatus] = useState<CycleStatus>({
        isOpen: true,
        cycleName: '',
        cycleId: null,
        isLoading: true,
    });

    useEffect(() => {
        checkCycle();
    }, []);

    const checkCycle = async () => {
        try {
            const { supabase } = await import('@/integrations/supabase/client');

            const { data, error } = await (supabase as any)
                .from('appraisal_cycles')
                .select('id, academic_year, semester, is_open')
                .eq('is_open', true)
                .limit(1);

            if (error) {
                setStatus({ isOpen: true, cycleName: '', cycleId: null, isLoading: false });
                return;
            }

            if (data && data.length > 0) {
                const cycle = data[0];
                setStatus({
                    isOpen: true,
                    cycleName: `${cycle.academic_year} — ${cycle.semester} Semester`,
                    cycleId: cycle.id,
                    isLoading: false,
                });
            } else {
                const { data: allCycles } = await (supabase as any)
                    .from('appraisal_cycles')
                    .select('id')
                    .limit(1);

                if (!allCycles || allCycles.length === 0) {
                    setStatus({ isOpen: true, cycleName: '', cycleId: null, isLoading: false });
                } else {
                    setStatus({ isOpen: false, cycleName: '', cycleId: null, isLoading: false });
                }
            }
        } catch {
            setStatus({ isOpen: true, cycleName: '', cycleId: null, isLoading: false });
        }
    };

    return status;
}
