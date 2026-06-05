export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'canceled';

export type ReportSection = 'pricing' | 'promotions' | 'new_services' | 'complaints';

export type ChangeFlag = 'new' | 'changed' | 'unchanged' | 'removed';

export interface AccountRow {
  id: string;
  owner_user_id: string;
  business_name: string;
  vertical: string;
  mollie_customer_id: string | null;
  mollie_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  created_at: string;
}

export interface CompetitorRow {
  id: string;
  account_id: string;
  name: string;
  website_url: string;
  google_place_id: string | null;
  active: boolean;
  added_at: string;
}

export interface ReportRow {
  id: string;
  account_id: string;
  period_start: string;
  period_end: string;
  status: 'generating' | 'ready' | 'failed';
  magic_token: string;
  summary_json: ReportSummary | null;
  created_at: string;
}

export interface ReportFindingRow {
  id: string;
  report_id: string;
  competitor_id: string;
  section: ReportSection;
  payload_json: FindingPayload;
  change_vs_previous: ChangeFlag;
}

export interface ScrapeRunRow {
  id: string;
  competitor_id: string;
  run_at: string;
  status: 'success' | 'partial' | 'failed';
  raw_html_storage_path: string | null;
  error: string | null;
}

export interface PricingItem {
  service: string;
  price: string;
  notes?: string;
}

export interface PromotionItem {
  title: string;
  description: string;
  expires?: string;
}

export interface ServiceItem {
  name: string;
  description?: string;
}

export interface ComplaintTheme {
  theme: string;
  example_quotes: string[];
  count: number;
}

export type FindingPayload =
  | { kind: 'pricing'; items: PricingItem[] }
  | { kind: 'promotions'; items: PromotionItem[] }
  | { kind: 'new_services'; items: ServiceItem[] }
  | { kind: 'complaints'; themes: ComplaintTheme[] };

export interface ReportSummary {
  competitor_count: number;
  highlights: {
    competitor_id: string;
    competitor_name: string;
    section: ReportSection;
    headline: string;
  }[];
}
