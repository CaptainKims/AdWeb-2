import { useState } from "react";
import { DollarSign, TrendingUp, Users, BarChart3 } from "lucide-react";

interface BudgetTabProps {
  campaignId: string;
}

export function BudgetTab({ campaignId }: BudgetTabProps) {
  const totalBudget = 2500000;
  const [tvBudget, setTvBudget] = useState(40);
  const [streamingBudget, setStreamingBudget] = useState(45);
  const [socialBudget, setSocialBudget] = useState(15);

  const handleSliderChange = (channel: "tv" | "streaming" | "social", value: number) => {
    const currentTotal = tvBudget + streamingBudget + socialBudget;
    const diff = value - (channel === "tv" ? tvBudget : channel === "streaming" ? streamingBudget : socialBudget);

    if (channel === "tv") {
      setTvBudget(value);
      // Distribute the difference proportionally
      if (streamingBudget + socialBudget > 0) {
        const ratio = streamingBudget / (streamingBudget + socialBudget);
        setStreamingBudget(Math.max(0, streamingBudget - diff * ratio));
        setSocialBudget(Math.max(0, socialBudget - diff * (1 - ratio)));
      }
    } else if (channel === "streaming") {
      setStreamingBudget(value);
      if (tvBudget + socialBudget > 0) {
        const ratio = tvBudget / (tvBudget + socialBudget);
        setTvBudget(Math.max(0, tvBudget - diff * ratio));
        setSocialBudget(Math.max(0, socialBudget - diff * (1 - ratio)));
      }
    } else {
      setSocialBudget(value);
      if (tvBudget + streamingBudget > 0) {
        const ratio = tvBudget / (tvBudget + streamingBudget);
        setTvBudget(Math.max(0, tvBudget - diff * ratio));
        setStreamingBudget(Math.max(0, streamingBudget - diff * (1 - ratio)));
      }
    }
  };

  const channels = [
    {
      id: "tv",
      name: "TV Broadcast",
      percentage: tvBudget,
      onChange: (value: number) => handleSliderChange("tv", value),
      color: "var(--chart-1)",
      cpm: 45,
      reach: 1200000,
      frequency: 3.8,
    },
    {
      id: "streaming",
      name: "Streaming Platforms",
      percentage: streamingBudget,
      onChange: (value: number) => handleSliderChange("streaming", value),
      color: "var(--chart-2)",
      cpm: 35,
      reach: 1400000,
      frequency: 4.2,
    },
    {
      id: "social",
      name: "Social Video",
      percentage: socialBudget,
      onChange: (value: number) => handleSliderChange("social", value),
      color: "var(--chart-3)",
      cpm: 12,
      reach: 800000,
      frequency: 5.5,
    },
  ];

  const calculateAmount = (percentage: number) => {
    return ((totalBudget * percentage) / 100).toLocaleString("nb-NO");
  };

  const totalReach = channels.reduce((sum, ch) => sum + ch.reach, 0);
  const avgFrequency = channels.reduce((sum, ch) => sum + ch.frequency * ch.percentage, 0) / 100;
  const avgCPM = channels.reduce((sum, ch) => sum + ch.cpm * ch.percentage, 0) / 100;

  return (
    <div className="p-8">
      {/* Total Budget Card */}
      <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6 mb-8">
        <div className="flex items-center gap-2 text-muted-foreground mb-2" style={{ fontSize: "12px" }}>
          <DollarSign size={16} />
          <span>Total Campaign Budget</span>
        </div>
        <div
          className="text-card-foreground"
          style={{ fontSize: "36px", fontWeight: "var(--font-weight-semibold)" }}
        >
          {totalBudget.toLocaleString("nb-NO")} NOK
        </div>
      </div>

      {/* Budget Allocation */}
      <div className="mb-8">
        <h3
          className="text-foreground mb-6"
          style={{
            fontSize: "20px",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-family-display)",
          }}
        >
          Channel Budget Allocation
        </h3>

        <div className="space-y-8">
          {channels.map((channel) => (
            <div key={channel.id} className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
              {/* Channel Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: channel.color }} />
                  <span
                    className="text-card-foreground"
                    style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}
                  >
                    {channel.name}
                  </span>
                </div>
                <div className="text-right">
                  <div
                    className="text-card-foreground"
                    style={{ fontSize: "20px", fontWeight: "var(--font-weight-semibold)" }}
                  >
                    {channel.percentage}%
                  </div>
                  <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                    {calculateAmount(channel.percentage)} NOK
                  </div>
                </div>
              </div>

              {/* Slider */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={channel.percentage}
                  onChange={(e) => channel.onChange(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${channel.color} 0%, ${channel.color} ${channel.percentage}%, var(--muted) ${channel.percentage}%, var(--muted) 100%)`,
                  }}
                />
              </div>

              {/* Estimates */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div>
                  <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>
                    CPM Estimate
                  </div>
                  <div className="text-card-foreground" style={{ fontSize: "14px", fontWeight: "var(--font-weight-semibold)" }}>
                    {channel.cpm} NOK
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>
                    Reach Estimate
                  </div>
                  <div className="text-card-foreground" style={{ fontSize: "14px", fontWeight: "var(--font-weight-semibold)" }}>
                    {(channel.reach * (channel.percentage / 100)).toLocaleString("nb-NO", {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>
                    Frequency Estimate
                  </div>
                  <div className="text-card-foreground" style={{ fontSize: "14px", fontWeight: "var(--font-weight-semibold)" }}>
                    {channel.frequency.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Estimates */}
      <div>
        <h3
          className="text-foreground mb-4"
          style={{
            fontSize: "20px",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-family-display)",
          }}
        >
          Campaign Performance Estimates
        </h3>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-3" style={{ fontSize: "12px" }}>
              <Users size={16} />
              <span>Total Reach</span>
            </div>
            <div
              className="text-card-foreground mb-1"
              style={{ fontSize: "28px", fontWeight: "var(--font-weight-semibold)" }}
            >
              {(totalReach * 0.85).toLocaleString("nb-NO", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Unique impressions (deduplicated)
            </div>
          </div>

          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-3" style={{ fontSize: "12px" }}>
              <TrendingUp size={16} />
              <span>Average Frequency</span>
            </div>
            <div
              className="text-card-foreground mb-1"
              style={{ fontSize: "28px", fontWeight: "var(--font-weight-semibold)" }}
            >
              {avgFrequency.toFixed(1)}
            </div>
            <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Times seen per person
            </div>
          </div>

          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-3" style={{ fontSize: "12px" }}>
              <BarChart3 size={16} />
              <span>Weighted CPM</span>
            </div>
            <div
              className="text-card-foreground mb-1"
              style={{ fontSize: "28px", fontWeight: "var(--font-weight-semibold)" }}
            >
              {avgCPM.toFixed(0)} NOK
            </div>
            <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Cost per thousand impressions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
