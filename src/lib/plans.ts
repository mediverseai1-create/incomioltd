// Central plan configuration. Limits are intentionally null (= not yet set) until supplied by the owner;
// change them here only. A null limit means "no cap configured", never an invented entitlement.
export type PlanKey = 'starter' | 'professional' | 'enterprise';
export type UsageKind = 'ai_analysis' | 'agent_run' | 'document_extraction' | 'forecast' | 'report' | 'ask_incomio';

export const USAGE_LABELS: Record<UsageKind, string> = {
  ai_analysis: 'AI financial analyses', agent_run: 'AI agent runs', document_extraction: 'Document extractions',
  forecast: 'Forecast generations', report: 'Report generations', ask_incomio: 'Ask Incomio questions',
};

export const PLANS: Record<PlanKey, { name: string; price: number; blurb: string; limits: Record<UsageKind, number | null>; paymentLinkEnv: string }> = {
  starter: { name: 'Starter', price: 47, blurb: 'For small teams getting receivables under control.', paymentLinkEnv: 'STARTER_PAYMENT_LINK',
    limits: { ai_analysis: null, agent_run: null, document_extraction: null, forecast: null, report: null, ask_incomio: null } },
  professional: { name: 'Professional', price: 57, blurb: 'For finance teams reconciling and forecasting every month.', paymentLinkEnv: 'PROFESSIONAL_PAYMENT_LINK',
    limits: { ai_analysis: null, agent_run: null, document_extraction: null, forecast: null, report: null, ask_incomio: null } },
  enterprise: { name: 'Enterprise', price: 97, blurb: 'For multi-business groups needing consolidated oversight.', paymentLinkEnv: 'ENTERPRISE_PAYMENT_LINK',
    limits: { ai_analysis: null, agent_run: null, document_extraction: null, forecast: null, report: null, ask_incomio: null } },
};

export const PLAN_KEYS = Object.keys(PLANS) as PlanKey[];

/** Payment links are read server-side from env; never invented. */
export function paymentLink(plan: PlanKey): string | null {
  return process.env[PLANS[plan].paymentLinkEnv] || null;
}
