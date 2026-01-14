export interface TPDocument {
  id: string;
  companyName: string;
  status: "draft" | "generated";
  lastUpdated: string;
}

export interface Company {
  id: string;
  name: string;
  country: string;
  industry: string;
  revenue: string;
  addedDate: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
}

export const mockTPDocuments: TPDocument[] = [
  {
    id: "1",
    companyName: "Acme Corporation",
    status: "generated",
    lastUpdated: "2024-01-15",
  },
  {
    id: "2",
    companyName: "Global Tech Industries",
    status: "draft",
    lastUpdated: "2024-01-14",
  },
  {
    id: "3",
    companyName: "Beta Manufacturing Ltd",
    status: "generated",
    lastUpdated: "2024-01-12",
  },
  {
    id: "4",
    companyName: "Sunrise Holdings",
    status: "draft",
    lastUpdated: "2024-01-10",
  },
];

export const mockCompanies: Company[] = [
  {
    id: "1",
    name: "Tech Solutions Inc",
    country: "United States",
    industry: "Technology",
    revenue: "$500M",
    addedDate: "2024-01-15",
  },
  {
    id: "2",
    name: "Global Manufacturing Co",
    country: "Germany",
    industry: "Manufacturing",
    revenue: "$1.2B",
    addedDate: "2024-01-14",
  },
  {
    id: "3",
    name: "Asia Pacific Trading",
    country: "Singapore",
    industry: "Trading",
    revenue: "$300M",
    addedDate: "2024-01-13",
  },
  {
    id: "4",
    name: "Nordic Innovations",
    country: "Sweden",
    industry: "Technology",
    revenue: "$150M",
    addedDate: "2024-01-12",
  },
];

export const mockProcessedCompanies: Company[] = [
  {
    id: "p1",
    name: "Excel Import Corp",
    country: "United Kingdom",
    industry: "Finance",
    revenue: "$800M",
    addedDate: "2024-01-16",
  },
  {
    id: "p2",
    name: "DataStream Analytics",
    country: "Canada",
    industry: "Technology",
    revenue: "$250M",
    addedDate: "2024-01-16",
  },
  {
    id: "p3",
    name: "Pacific Rim Holdings",
    country: "Japan",
    industry: "Conglomerate",
    revenue: "$2.1B",
    addedDate: "2024-01-16",
  },
];

export const mockScreeningResults: Company[] = [
  {
    id: "s1",
    name: "Comparable Tech Inc",
    country: "United States",
    industry: "Technology",
    revenue: "$480M",
    addedDate: "2024-01-16",
  },
  {
    id: "s2",
    name: "Similar Solutions Ltd",
    country: "Ireland",
    industry: "Technology",
    revenue: "$520M",
    addedDate: "2024-01-16",
  },
  {
    id: "s3",
    name: "Peer Group Corp",
    country: "Netherlands",
    industry: "Technology",
    revenue: "$450M",
    addedDate: "2024-01-16",
  },
];

export const mockAuditEntries: AuditEntry[] = [
  {
    id: "1",
    timestamp: "2024-01-15 14:32:00",
    user: "john.doe@company.com",
    action: "Created TP Document",
    target: "Acme Corporation",
  },
  {
    id: "2",
    timestamp: "2024-01-15 13:15:00",
    user: "jane.smith@company.com",
    action: "Uploaded Company List",
    target: "Q4_Companies.xlsx",
  },
  {
    id: "3",
    timestamp: "2024-01-15 11:45:00",
    user: "john.doe@company.com",
    action: "Ran Company Screening",
    target: "Tech Solutions Inc",
  },
  {
    id: "4",
    timestamp: "2024-01-14 16:20:00",
    user: "admin@company.com",
    action: "Generated PDF",
    target: "Global Tech Industries",
  },
  {
    id: "5",
    timestamp: "2024-01-14 10:00:00",
    user: "jane.smith@company.com",
    action: "Saved Company Shortlist",
    target: "Screening Results - Batch 12",
  },
];
