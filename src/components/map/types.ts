export interface MapOrg {
  id: string;
  name: string;
  slug: string;
  orgType: string;
  sector: string;
  description: string;
  foundedYear: number | null;
  employeeRange: string | null;
  fundingStage: string | null;
  website: string | null;
  district: string;
  districtSlug: string;
}

export interface MapVideo {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  channelTitle: string | null;
  publishedAt: string | null;
  lrsTotal: number | null;
  aiSectors: string[];
  aiSummary: string | null;
  contentType: string | null;
  duration: number | null;
  district: string;
  districtSlug: string;
}

export interface ClusterClickState {
  clusterId: number;
  coordinates: [number, number];
  leaves: GeoJSON.Feature[];
  totalCount: number;
}
