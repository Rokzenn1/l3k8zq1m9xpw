export type ObjectiveStatus = "locked" | "unlocked" | "validated";

export type CounterRow = {
  id: string;
  value: number;
};

export type ObjectiveRow = {
  id: string;
  threshold: number;
  description: string;
  status: ObjectiveStatus;
  proof_url: string | null;
  created_at: string;
};

export type SiteSettingsRow = {
  id: number;
  evg_first_name: string;
};
