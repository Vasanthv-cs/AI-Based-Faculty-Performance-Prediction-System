import { supabase } from './client';

export interface FinalAppraisal {
  category1_total: number;
  category2_total: number;
  category3_total: number;
  total_score: number;
  percentage: number;
  final_grade: string;
}

/**
 * Fetches the final appraisal for a given user by querying 
 * the performance_scores table.
 */
export async function getFinalAppraisal(
  userId: string
): Promise<FinalAppraisal | null> {
  const { data, error } = await supabase
    .from('performance_scores')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is the "row not found" error
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    category1_total: Number(data.teaching_score || 0),
    category2_total: Number(data.research_score || 0),
    category3_total: Number(data.contribution_score || 0),
    total_score: Number(data.overall_score || 0),
    percentage: (Number(data.overall_score || 0) / 250) * 100, // Assuming out of 250
    final_grade: data.category || 'N/A',
  };
}

