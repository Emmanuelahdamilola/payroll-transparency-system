import Groq from 'groq-sdk';
import config from '../config/env';
import { FlagType } from '../types';

// Initialize Groq client
const groq = new Groq({
  apiKey: config.GROQ_API_KEY || '',
});

// Check if Groq is configured
const isGroqConfigured = !!config.GROQ_API_KEY && config.GROQ_API_KEY!== 'gsk-your-groq-api-key-here';

/**
 * Generate enhanced explanation using Groq
 * Using llama-3.3-70b-versatile - FREE and FAST!
 */
export const generateAIExplanation = async (
  type: FlagType,
  data: any,
  templateExplanation: string
): Promise<string> => {
  // If Groq is not configured, return template explanation
  if (!isGroqConfigured) {
    console.log('⚠️  Groq not configured, using template explanation');
    return templateExplanation;
  }

  try {
    const prompt = buildPrompt(type, data, templateExplanation);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // FREE! 70B parameter model
      messages: [
        {
          role: 'system',
          content: `You are a fraud detection analyst for a Nigerian civil service payroll system. Your job is to explain anomalies in clear, professional language that auditors and administrators can understand. Be concise (2-3 sentences max), factual, and highlight the severity and recommended action.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const aiExplanation = completion.choices[0]?.message?.content?.trim();
    
    if (aiExplanation) {
      console.log('✅ AI explanation generated (Groq/Llama)');
      return aiExplanation;
    }

    return templateExplanation;
  } catch (error: any) {
    console.error('Groq API error:', error.message);
    // Fallback to template explanation
    return templateExplanation;
  }
};

/**
 * Build prompt based on flag type
 */
function buildPrompt(type: FlagType, data: any, templateExplanation: string): string {
  switch (type) {
    case FlagType.GHOST:
      return `Generate a professional explanation for a ghost worker detection:
      
Staff Hash: ${data.staffHash.substring(0, 16)}...
Salary: ₦${data.salary.toLocaleString()}
Issue: This staff hash is not found in the verified registry

Template: ${templateExplanation}

Provide a clear, actionable explanation for auditors in 2-3 sentences.`;

    case FlagType.MISSING_REGISTRY:
      return `Generate a professional explanation for an unverified staff member:
      
Staff Hash: ${data.staffHash.substring(0, 16)}...
Verified: ${data.verified}
Blockchain Transactions: ${data.blockchainTxs}
Issue: Staff exists but not verified on blockchain

Template: ${templateExplanation}

Provide a clear, actionable explanation for auditors in 2-3 sentences.`;

    case FlagType.DUPLICATE:
      if (data.field === 'Name (Fuzzy)') {
        return `Generate a professional explanation for a potential duplicate based on name similarity:
        
Similarity Score: ${(data.similarity * 100).toFixed(1)}%
Name 1: ${data.name1}
Name 2: ${data.name2}
Matched Staff Hash: ${data.matchedWith.substring(0, 16)}...
Issue: Two staff members have very similar names

Template: ${templateExplanation}

Provide a clear, actionable explanation for auditors in 2-3 sentences.`;
      } else {
        return `Generate a professional explanation for a duplicate ${data.field} detection:
        
Field: ${data.field}
Duplicate Count: ${data.duplicateCount} staff members
Issue: This ${data.field} is registered to multiple staff

Template: ${templateExplanation}

Provide a clear, actionable explanation for auditors in 2-3 sentences.`;
      }

    case FlagType.ANOMALY:
      return `Generate a professional explanation for a salary anomaly:
      
Salary: ₦${data.salary.toLocaleString()}
Grade: ${data.grade}
Expected Range: ₦${data.expectedMin.toLocaleString()} - ₦${data.expectedMax.toLocaleString()}
Deviation: ${data.deviation}%
Issue: Salary is ${data.salary < data.expectedMin ? 'below' : 'above'} expected range

Template: ${templateExplanation}

Provide a clear, actionable explanation for auditors in 2-3 sentences.`;

    default:
      return `Explain this payroll anomaly professionally: ${templateExplanation}`;
  }
}

/**
 * Generate batch summary report using Groq
 */
export const generateBatchSummary = async (batchData: {
  totalStaff: number;
  totalAmount: number;
  flaggedCount: number;
  ghostWorkers: number;
  duplicates: number;
  salaryAnomalies: number;
  month: number;
  year: number;
}): Promise<string> => {
  if (!isGroqConfigured) {
    return `Payroll batch for ${batchData.month}/${batchData.year} processed: ${batchData.totalStaff} staff, ₦${batchData.totalAmount.toLocaleString()} total. ${batchData.flaggedCount} anomalies detected (${batchData.ghostWorkers} ghost workers, ${batchData.duplicates} duplicates, ${batchData.salaryAnomalies} salary anomalies).`;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a payroll auditor. Generate a concise executive summary (2-3 sentences) of a payroll batch analysis.',
        },
        {
          role: 'user',
          content: `Summarize this payroll batch:
Month/Year: ${batchData.month}/${batchData.year}
Total Staff: ${batchData.totalStaff}
Total Amount: ₦${batchData.totalAmount.toLocaleString()}
Flags: ${batchData.flaggedCount} total
- Ghost Workers: ${batchData.ghostWorkers}
- Duplicates: ${batchData.duplicates}
- Salary Anomalies: ${batchData.salaryAnomalies}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    console.log('✅ Batch summary generated (Groq/Llama)');
    return summary || 'Summary generation failed';
  } catch (error: any) {
    console.error('Groq summary generation error:', error.message);
    return `Batch ${batchData.month}/${batchData.year}: ${batchData.totalStaff} staff, ${batchData.flaggedCount} flags detected.`;
  }
};

/**
 * Analyze flag pattern and suggest actions using Groq
 */
export const analyzeFlags = async (flags: any[]): Promise<string> => {
  if (!isGroqConfigured || flags.length === 0) {
    return 'Analysis unavailable. Please review flags manually.';
  }

  try {
    const flagSummary = flags.map(f => ({
      type: f.type,
      score: f.score,
      staffHash: f.staffHash.substring(0, 8),
    }));

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a fraud detection analyst. Analyze patterns in payroll flags and provide actionable recommendations.',
        },
        {
          role: 'user',
          content: `Analyze these payroll flags and suggest priority actions:

${JSON.stringify(flagSummary, null, 2)}

Provide 2-3 key recommendations for the audit team.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const analysis = completion.choices[0]?.message?.content?.trim();
    console.log('✅ Flag analysis generated (Groq/Llama)');
    return analysis || 'Analysis failed';
  } catch (error: any) {
    console.error('Groq analysis error:', error.message);
    return 'Pattern analysis unavailable.';
  }
};

export default {
  generateAIExplanation,
  generateBatchSummary,
  analyzeFlags,
};