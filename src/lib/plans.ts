// Central plan configuration: change plan entitlements here only.
export type PlanKey = 'starter' | 'professional' | 'enterprise';
export type UsageKind = 'ai_analysis' | 'agent_run' | 'document_extraction' | 'forecast' | 'report' | 'ask_incomio';

export const USAGE_LABELS: Record<UsageKind, string> = {
  ai_analysis: 'AI financial analyses', agent_run: 'AI agent runs', document_extraction: 'Document extractions',
  forecast: 'Forecast generations', report: 'Report generations', ask_incomio: 'Ask Incomio questions',
};

/** Credits charged per operation. A plan's monthly credits are spent across all of these. */
export const CREDIT_COST: Record<UsageKind, number> = {
  ask_incomio: 5, ai_analysis: 20, report: 15, forecast: 25, document_extraction: 30, agent_run: 50,
};

export const PLANS: Record<PlanKey, { name: string; price: number; blurb: string; monthlyCredits: number; seats: number | null; businessUnits: number | null; features: string[]; paymentLinkEnv: string }> = {
  starter: { name: 'Starter', price: 47, blurb: 'For small teams getting receivables under control.', monthlyCredits: 7000, seats: 3, businessUnits: 1, paymentLinkEnv: 'STARTER_PAYMENT_LINK',
    features: ['7,000 AI credits / month', 'Up to 3 team members', '1 business unit', 'Receivables, invoices & payments', 'Reconciliation review queue', 'Cash-flow scenarios', 'Collections & reminder drafts', 'Ask Incomio & AI agents', 'Reports with CSV / print-to-PDF', 'Email support'] },
  professional: { name: 'Professional', price: 57, blurb: 'For finance teams reconciling and forecasting every month.', monthlyCredits: 9000, seats: 10, businessUnits: 5, paymentLinkEnv: 'PROFESSIONAL_PAYMENT_LINK',
    features: ['9,000 AI credits / month', 'Up to 10 team members', 'Up to 5 business units', 'Everything in Starter', 'Multi-business consolidated reports', 'PDF & image invoice extraction at scale', 'Role-based approvals for finance leads', 'Priority email support'] },
  enterprise: { name: 'Enterprise', price: 97, blurb: 'For multi-business groups needing consolidated oversight.', monthlyCredits: 11000, seats: 25, businessUnits: null, paymentLinkEnv: 'ENTERPRISE_PAYMENT_LINK',
    features: ['11,000 AI credits / month', 'Up to 25 team members', 'Unlimited business units', 'Everything in Professional', 'Group-wide consolidation across branches & subsidiaries', 'Assisted onboarding & data-import help', 'Priority support'] },
};

export const PLAN_KEYS = Object.keys(PLANS) as PlanKey[];

/** Payment links are read server-side from env; never invented. */
export function paymentLink(plan: PlanKey): string | null {
  return process.env[PLANS[plan].paymentLinkEnv] || null;
}
