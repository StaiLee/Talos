export type NormalizedTender = {
  externalId: string;
  reference?: string;
  title: string;
  buyer: string;
  city?: string;
  department?: string;
  description?: string;
  cpv?: string;
  url?: string;
  publishedAt?: Date;
  deadline?: Date;
  domains: string[];
  score: number;
  metadata: Record<string, unknown>;
};

export type CollectionResult = {
  discovered: number;
  created: number;
  updated: number;
};
