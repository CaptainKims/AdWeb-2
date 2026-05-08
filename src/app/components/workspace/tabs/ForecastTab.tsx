import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Copy, TrendingUp } from "lucide-react";

interface ForecastTabProps {
  campaignId: string;
}

export function ForecastTab({ campaignId }: ForecastTabProps) {
  const [selectedScenario, setSelectedScenario] = useState<"a" | "b">("a");

  // Reach Curve Data
  const reachData = [
    { week: "Week 1", reach: 450000, scenarioA: 450000, scenarioB: 380000 },
    { week: "Week 2", reach: 820000, scenarioA: 820000, scenarioB: 720000 },
    { week: "Week 3", reach: 1150000, scenarioA: 1150000, scenarioB: 1050000 },
    { week: "Week 4", reach: 1450000, scenarioA: 1450000, scenarioB: 1380000 },
    { week: "Week 5", reach: 1720000, scenarioA: 1720000, scenarioB: 1680000 },
    { week: "Week 6", reach: 1950000, scenarioA: 1950000, scenarioB: 1930000 },
    { week: "Week 7", reach: 2150000, scenarioA: 2150000, scenarioB: 2140000 },
    { week: "Week 8", reach: 2320000, scenarioA: 2320000, scenarioB: 2310000 },
  ];

  // Frequency Distribution
  const frequencyData = [
    { frequency: "1x", users: 520000 },
    { frequency: "2x", users: 680000 },
    { frequency: "3x", users: 520000 },
    { frequency: "4x", users: 380000 },
    { frequency: "5x", users: 180000 },
    { frequency: "6+", users: 120000 },
  ];

  // Budget Burn
  const budgetBurnData = [
    { week: "Week 1", planned: 312500, actual: 320000 },
    { week: "Week 2", planned: 625000, actual: 630000 },
    { week: "Week 3", planned: 937500, actual: 925000 },
    { week: "Week 4", planned: 1250000, actual: 1250000 },
    { week: "Week 5", planned: 1562500, actual: 0 },
    { week: "Week 6", planned: 1875000, actual: 0 },
    { week: "Week 7", planned: 2187500, actual: 0 },
    { week: "Week 8", planned: 2500000, actual: 0 },
  ];

  // Channel Contribution
  const channelData = [
    { name: "TV Broadcast", value: 40, color: "var(--chart-1)" },
    { name: "Streaming", value: 45, color: "var(--chart-2)" },
    { name: "Social Video", value: 15, color: "var(--chart-3)" },
  ];

  return (
    <div className="p-8">
      {/* Header with Scenario Selector */}
      <div className="flex items-center justify-between mb-8">
        <h2
          className="text-foreground"
          style={{
            fontSize: "24px",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-family-display)",
          }}
        >
          Campaign Forecast
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedScenario("a")}
            className={`px-4 py-2 rounded-[var(--radius-button)] border transition-colors ${
              selectedScenario === "a"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-card-foreground border-border hover:border-primary"
            }`}
            style={{ fontSize: "13px", fontWeight: "var(--font-weight-semibold)" }}
          >
            Scenario A (Current)
          </button>
          <button
            onClick={() => setSelectedScenario("b")}
            className={`px-4 py-2 rounded-[var(--radius-button)] border transition-colors ${
              selectedScenario === "b"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-card-foreground border-border hover:border-primary"
            }`}
            style={{ fontSize: "13px", fontWeight: "var(--font-weight-semibold)" }}
          >
            Scenario B
          </button>
          <button
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-[var(--radius-button)] hover:bg-secondary/80 transition-colors flex items-center gap-2"
            style={{ fontSize: "13px" }}
          >
            <Copy size={14} />
            Duplicate Scenario
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* Row 1: Reach Curve and Frequency Distribution */}
        <div className="grid grid-cols-2 gap-6">
          {/* Reach Curve */}
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-muted-foreground" />
              <h3
                className="text-card-foreground"
                style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}
              >
                Cumulative Reach Curve
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={reachData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="week"
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="scenarioA"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  name="Scenario A"
                />
                <Line
                  type="monotone"
                  dataKey="scenarioB"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Scenario B"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Frequency Distribution */}
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
            <h3
              className="text-card-foreground mb-4"
              style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}
            >
              Frequency Distribution
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={frequencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="frequency"
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="users" fill="var(--chart-2)" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Budget Burn and Channel Contribution */}
        <div className="grid grid-cols-2 gap-6">
          {/* Budget Burn Chart */}
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
            <h3
              className="text-card-foreground mb-4"
              style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}
            >
              Budget Burn Rate
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={budgetBurnData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="week"
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="planned"
                  stroke="var(--chart-4)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Planned"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  name="Actual"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Channel Contribution Pie */}
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
            <h3
              className="text-card-foreground mb-4"
              style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}
            >
              Channel Budget Distribution
            </h3>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="60%" height={280}>
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="space-y-3">
                {channelData.map((channel) => (
                  <div key={channel.name} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: channel.color }}
                    />
                    <div>
                      <div className="text-card-foreground" style={{ fontSize: "13px" }}>
                        {channel.name}
                      </div>
                      <div
                        className="text-muted-foreground"
                        style={{ fontSize: "11px" }}
                      >
                        {((2500000 * channel.value) / 100).toLocaleString("nb-NO")} NOK
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
          <h3
            className="text-card-foreground mb-4"
            style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}
          >
            Key Performance Indicators
          </h3>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>
                Total Impressions
              </div>
              <div
                className="text-card-foreground"
                style={{ fontSize: "20px", fontWeight: "var(--font-weight-semibold)" }}
              >
                7,500,000
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>
                Unique Reach
              </div>
              <div
                className="text-card-foreground"
                style={{ fontSize: "20px", fontWeight: "var(--font-weight-semibold)" }}
              >
                2,320,000
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>
                Average Frequency
              </div>
              <div
                className="text-card-foreground"
                style={{ fontSize: "20px", fontWeight: "var(--font-weight-semibold)" }}
              >
                3.2
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>
                Effective CPM
              </div>
              <div
                className="text-card-foreground"
                style={{ fontSize: "20px", fontWeight: "var(--font-weight-semibold)" }}
              >
                333 NOK
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
