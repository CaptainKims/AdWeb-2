import { Calendar, DollarSign, Target, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";

interface OverviewTabProps {
  campaignId: string;
}

export function OverviewTab({ campaignId }: OverviewTabProps) {
  const stats = [
    { label: "Campaign Duration", value: "8 weeks", subtext: "May 1 - Jun 30, 2026", icon: Calendar },
    { label: "Total Budget", value: "2,500,000 NOK", subtext: "1,250,000 spent (50%)", icon: DollarSign },
    { label: "Campaign Goal", value: "Product Launch", subtext: "Multi-channel strategy", icon: Target },
    { label: "Expected Reach", value: "2.5M impressions", subtext: "3.2 avg frequency", icon: TrendingUp },
  ];

  const completeness = [
    { label: "Campaign Details", status: "complete", value: 100 },
    { label: "Media Streams", status: "complete", value: 100 },
    { label: "Placements", status: "warning", value: 67 },
    { label: "Creatives", status: "warning", value: 75 },
    { label: "Budget Allocation", status: "complete", value: 100 },
  ];

  return (
    <div className="p-8">
      {/* Campaign Header */}
      <div className="mb-8">
        <h2
          className="text-foreground mb-2"
          style={{
            fontSize: "28px",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-family-display)",
          }}
        >
          Summer Car Launch 2026
        </h2>
        <div className="flex items-center gap-6 text-muted-foreground" style={{ fontSize: "14px" }}>
          <span>Advertiser: AutoNordic AS</span>
          <span>•</span>
          <span>Agency: Media House Norway</span>
          <span>•</span>
          <span className="text-[#22c55e]">● Active</span>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card border border-border rounded-[var(--radius-lg)] p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2" style={{ fontSize: "12px" }}>
                <Icon size={14} />
                <span>{stat.label}</span>
              </div>
              <div
                className="text-card-foreground mb-1"
                style={{ fontSize: "20px", fontWeight: "var(--font-weight-semibold)" }}
              >
                {stat.value}
              </div>
              <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                {stat.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* Campaign Completeness */}
      <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6 mb-8">
        <h3
          className="text-card-foreground mb-4"
          style={{
            fontSize: "18px",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-family-display)",
          }}
        >
          Campaign Completeness
        </h3>
        <div className="space-y-4">
          {completeness.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {item.status === "complete" ? (
                    <CheckCircle size={16} className="text-[#22c55e]" />
                  ) : (
                    <AlertCircle size={16} className="text-[#f59e0b]" />
                  )}
                  <span className="text-card-foreground" style={{ fontSize: "14px" }}>
                    {item.label}
                  </span>
                </div>
                <span
                  className="text-card-foreground"
                  style={{ fontSize: "13px", fontWeight: "var(--font-weight-semibold)" }}
                >
                  {item.value}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={item.status === "complete" ? "bg-[#22c55e]" : "bg-[#f59e0b]"}
                  style={{ width: `${item.value}%`, height: "100%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Distribution */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-[var(--radius-lg)] p-5">
          <div className="text-muted-foreground mb-2" style={{ fontSize: "12px" }}>
            TV Broadcast
          </div>
          <div
            className="text-card-foreground mb-1"
            style={{ fontSize: "24px", fontWeight: "var(--font-weight-semibold)" }}
          >
            40%
          </div>
          <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
            1,000,000 NOK
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
            <div className="h-full bg-chart-1" style={{ width: "40%" }} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-[var(--radius-lg)] p-5">
          <div className="text-muted-foreground mb-2" style={{ fontSize: "12px" }}>
            Streaming Platforms
          </div>
          <div
            className="text-card-foreground mb-1"
            style={{ fontSize: "24px", fontWeight: "var(--font-weight-semibold)" }}
          >
            45%
          </div>
          <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
            1,125,000 NOK
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
            <div className="h-full bg-chart-2" style={{ width: "45%" }} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-[var(--radius-lg)] p-5">
          <div className="text-muted-foreground mb-2" style={{ fontSize: "12px" }}>
            Social Video
          </div>
          <div
            className="text-card-foreground mb-1"
            style={{ fontSize: "24px", fontWeight: "var(--font-weight-semibold)" }}
          >
            15%
          </div>
          <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
            375,000 NOK
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
            <div className="h-full bg-chart-3" style={{ width: "15%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
