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
  {
    id: "5",
    companyName: "TechCorp International",
    status: "generated",
    lastUpdated: "2023-12-20",
  },
  {
    id: "6",
    companyName: "Finance Global Ltd",
    status: "generated",
    lastUpdated: "2023-12-15",
  },
  {
    id: "7",
    companyName: "Manufacturing Plus",
    status: "generated",
    lastUpdated: "2023-11-28",
  },
  {
    id: "8",
    companyName: "Trading Solutions Co",
    status: "generated",
    lastUpdated: "2023-11-20",
  },
  {
    id: "9",
    companyName: "Innovation Hub Inc",
    status: "generated",
    lastUpdated: "2023-10-15",
  },
  {
    id: "10",
    companyName: "Energy Systems Group",
    status: "generated",
    lastUpdated: "2023-10-10",
  },
  {
    id: "11",
    companyName: "Healthcare Solutions",
    status: "generated",
    lastUpdated: "2023-09-25",
  },
  {
    id: "12",
    companyName: "Retail Dynamics",
    status: "generated",
    lastUpdated: "2023-09-18",
  },
  {
    id: "13",
    companyName: "Construction Partners",
    status: "draft",
    lastUpdated: "2024-01-08",
  },
  {
    id: "14",
    companyName: "Logistics Worldwide",
    status: "generated",
    lastUpdated: "2024-01-05",
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
  {
    id: "5",
    name: "Finance Capital Group",
    country: "United Kingdom",
    industry: "Finance",
    revenue: "$800M",
    addedDate: "2024-01-10",
  },
  {
    id: "6",
    name: "Energy Power Systems",
    country: "Canada",
    industry: "Energy",
    revenue: "$2.5B",
    addedDate: "2024-01-08",
  },
  {
    id: "7",
    name: "Healthcare Innovations",
    country: "Switzerland",
    industry: "Healthcare",
    revenue: "$1.8B",
    addedDate: "2024-01-05",
  },
  {
    id: "8",
    name: "Retail Giants Corp",
    country: "France",
    industry: "Retail",
    revenue: "$950M",
    addedDate: "2023-12-28",
  },
  {
    id: "9",
    name: "Construction Masters",
    country: "Australia",
    industry: "Construction",
    revenue: "$600M",
    addedDate: "2023-12-22",
  },
  {
    id: "10",
    name: "Logistics Express",
    country: "Netherlands",
    industry: "Logistics",
    revenue: "$450M",
    addedDate: "2023-12-18",
  },
  {
    id: "11",
    name: "Telecom Networks",
    country: "Japan",
    industry: "Telecommunications",
    revenue: "$1.5B",
    addedDate: "2023-12-15",
  },
  {
    id: "12",
    name: "Media Holdings",
    country: "United States",
    industry: "Media",
    revenue: "$750M",
    addedDate: "2023-12-10",
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
  {
    id: "p4",
    name: "Green Energy Solutions",
    country: "Denmark",
    industry: "Energy",
    revenue: "$1.1B",
    addedDate: "2024-01-14",
  },
  {
    id: "p5",
    name: "Pharma Research Labs",
    country: "Switzerland",
    industry: "Healthcare",
    revenue: "$3.2B",
    addedDate: "2024-01-12",
  },
  {
    id: "p6",
    name: "E-Commerce Platform",
    country: "United States",
    industry: "Retail",
    revenue: "$1.9B",
    addedDate: "2024-01-10",
  },
  {
    id: "p7",
    name: "Infrastructure Builders",
    country: "India",
    industry: "Construction",
    revenue: "$850M",
    addedDate: "2024-01-08",
  },
  {
    id: "p8",
    name: "Shipping Express",
    country: "Singapore",
    industry: "Logistics",
    revenue: "$520M",
    addedDate: "2024-01-05",
  },
  {
    id: "p9",
    name: "5G Networks Inc",
    country: "South Korea",
    industry: "Telecommunications",
    revenue: "$2.3B",
    addedDate: "2023-12-28",
  },
  {
    id: "p10",
    name: "Digital Media Group",
    country: "United States",
    industry: "Media",
    revenue: "$680M",
    addedDate: "2023-12-22",
  },
  {
    id: "p11",
    name: "Auto Manufacturing",
    country: "Germany",
    industry: "Manufacturing",
    revenue: "$4.5B",
    addedDate: "2023-12-18",
  },
  {
    id: "p12",
    name: "Commodity Traders",
    country: "Switzerland",
    industry: "Trading",
    revenue: "$1.4B",
    addedDate: "2023-12-15",
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
