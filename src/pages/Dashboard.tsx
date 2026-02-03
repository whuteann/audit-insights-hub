import { useState, useMemo } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockTPDocuments, mockProcessedCompanies, mockCompanies } from "@/data/mockData";

// Colors aligned with app theme - using status and accent colors
const COLORS = [
  "hsl(160, 60%, 45%)", // Generated/Teal (status-generated)
  "hsl(173, 58%, 39%)", // Accent/Teal (accent)
  "hsl(217, 91%, 60%)", // Processing/Blue (status-processing)
  "hsl(45, 93%, 47%)", // Draft/Amber (status-draft)
  "hsl(222, 47%, 50%)", // Primary variant
  "hsl(160, 60%, 55%)", // Teal lighter
  "hsl(173, 58%, 50%)", // Accent lighter
  "hsl(217, 91%, 50%)", // Blue lighter
  "hsl(45, 93%, 55%)", // Amber lighter
  "hsl(222, 47%, 60%)", // Slate lighter
];

export default function Dashboard() {
  // Filter states
  const [reportsYearFilter, setReportsYearFilter] = useState<string>("all");
  const [industrySourceFilter, setIndustrySourceFilter] = useState<string>("all");
  const [companiesWeeksFilter, setCompaniesWeeksFilter] = useState<string>("8");

  // Get available years from reports
  const availableYears = useMemo(() => {
    const years = new Set(
      mockTPDocuments
        .filter((doc) => doc.status === "generated")
        .map((doc) => new Date(doc.lastUpdated).getFullYear())
    );
    return Array.from(years).sort((a, b) => b - a);
  }, []);

  // 1. Reports generated each month
  const reportsByMonth = useMemo(() => {
    const monthData: Record<string, number> = {};
    
    mockTPDocuments
      .filter((doc) => {
        if (doc.status !== "generated") return false;
        if (reportsYearFilter !== "all") {
          const docYear = new Date(doc.lastUpdated).getFullYear();
          return docYear === parseInt(reportsYearFilter);
        }
        return true;
      })
      .forEach((doc) => {
        const date = new Date(doc.lastUpdated);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthData[monthKey] = (monthData[monthKey] || 0) + 1;
      });

    return Object.entries(monthData)
      .map(([month, count]) => ({
        month: new Date(month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        count,
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [reportsYearFilter]);

  // 2. Industry types spread
  const industrySpread = useMemo(() => {
    const industryCounts: Record<string, number> = {};
    
    let companiesToProcess: typeof mockCompanies = [];
    if (industrySourceFilter === "all") {
      companiesToProcess = [...mockProcessedCompanies, ...mockCompanies];
    } else if (industrySourceFilter === "processed") {
      companiesToProcess = mockProcessedCompanies;
    } else if (industrySourceFilter === "database") {
      companiesToProcess = mockCompanies;
    }
    
    companiesToProcess.forEach((company) => {
      industryCounts[company.industry] = (industryCounts[company.industry] || 0) + 1;
    });

    return Object.entries(industryCounts).map(([industry, count]) => ({
      name: industry,
      value: count,
    }));
  }, [industrySourceFilter]);

  // 3. Total reports generated
  const totalReportsGenerated = useMemo(() => {
    return mockTPDocuments.filter((doc) => doc.status === "generated").length;
  }, []);

  // 4. Reports generated this week
  const reportsThisWeek = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return mockTPDocuments.filter((doc) => {
      if (doc.status !== "generated") return false;
      const docDate = new Date(doc.lastUpdated);
      return docDate >= startOfWeek;
    }).length;
  }, []);

  // 5. Companies processed each week
  const companiesByWeek = useMemo(() => {
    const weekData: Record<string, number> = {};
    
    [...mockProcessedCompanies, ...mockCompanies].forEach((company) => {
      const date = new Date(company.addedDate);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split("T")[0];
      weekData[weekKey] = (weekData[weekKey] || 0) + 1;
    });

      const weeks = Object.entries(weekData)
      .map(([week, count]) => ({
        week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
      }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

    if (companiesWeeksFilter === "all") {
      return weeks;
    }
    const weeksToShow = parseInt(companiesWeeksFilter);
    return weeks.slice(-weeksToShow);
  }, [companiesWeeksFilter]);

  const chartConfig = {
    count: {
      label: "Count",
      color: "hsl(var(--chart-1))",
    },
  };

  const pieChartConfig = industrySpread.reduce((acc, item, index) => {
    acc[item.name] = {
      label: item.name,
      color: COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your transfer pricing documentation and company data</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="border-l-4" style={{ borderLeftColor: "hsl(var(--status-generated))" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Total Reports Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: "hsl(var(--status-generated))" }}>
              {totalReportsGenerated}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              All generated TP documents
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: "hsl(var(--accent))" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Reports Generated This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: "hsl(var(--accent))" }}>
              {reportsThisWeek}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Documents generated this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Reports Generated Each Month - Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Reports Generated by Month</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="reports-year-filter" className="text-sm text-muted-foreground">
                  Year:
                </Label>
                <Select value={reportsYearFilter} onValueChange={setReportsYearFilter}>
                  <SelectTrigger id="reports-year-filter" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--status-generated))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Industry Types Spread - Pie Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Industry Types Distribution</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="industry-source-filter" className="text-sm text-muted-foreground">
                  Source:
                </Label>
                <Select value={industrySourceFilter} onValueChange={setIndustrySourceFilter}>
                  <SelectTrigger id="industry-source-filter" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="processed">Processed Only</SelectItem>
                    <SelectItem value="database">Database Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieChartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={industrySpread}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="hsl(var(--accent))"
                    dataKey="value"
                  >
                    {industrySpread.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Companies Processed Each Week - Bar Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Companies Processed by Week</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="companies-weeks-filter" className="text-sm text-muted-foreground">
                  Weeks:
                </Label>
                <Select value={companiesWeeksFilter} onValueChange={setCompaniesWeeksFilter}>
                  <SelectTrigger id="companies-weeks-filter" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">Last 4 Weeks</SelectItem>
                    <SelectItem value="8">Last 8 Weeks</SelectItem>
                    <SelectItem value="12">Last 12 Weeks</SelectItem>
                    <SelectItem value="16">Last 16 Weeks</SelectItem>
                    <SelectItem value="all">All Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companiesByWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

