import { useState } from "react";
import { Link } from "react-router";
import { Eye, Check, Tv, Monitor, Share2 } from "lucide-react";

export function TemplateGallery() {
  const [selectedGoal, setSelectedGoal] = useState<string>("all");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedComplexity, setSelectedComplexity] = useState<string>("all");

  const goals = [
    { id: "all", label: "All Goals" },
    { id: "awareness", label: "Brand Awareness" },
    { id: "launch", label: "Product Launch" },
    { id: "always-on", label: "Always On" },
    { id: "promotion", label: "Promotion" },
    { id: "event", label: "Event" },
  ];

  const channels = [
    { id: "tv", label: "TV", icon: Tv },
    { id: "streaming", label: "Streaming", icon: Monitor },
    { id: "social", label: "Social", icon: Share2 },
  ];

  const complexities = [
    { id: "all", label: "All Levels" },
    { id: "simple", label: "Simple" },
    { id: "professional", label: "Professional" },
  ];

  const templates = [
    {
      id: 1,
      name: "Summer Product Launch",
      goal: "Product Launch",
      channels: ["tv", "streaming", "social"],
      complexity: "professional",
      duration: "8 weeks",
      budget: "2,500,000 NOK",
      channelMix: { tv: 40, streaming: 45, social: 15 },
      reach: "2.5M impressions",
    },
    {
      id: 2,
      name: "Brand Awareness - Always On",
      goal: "Brand Awareness",
      channels: ["tv", "streaming"],
      complexity: "simple",
      duration: "12 weeks",
      budget: "1,800,000 NOK",
      channelMix: { tv: 60, streaming: 40, social: 0 },
      reach: "1.8M impressions",
    },
    {
      id: 3,
      name: "Flash Sale Promotion",
      goal: "Promotion",
      channels: ["streaming", "social"],
      complexity: "simple",
      duration: "2 weeks",
      budget: "500,000 NOK",
      channelMix: { tv: 0, streaming: 60, social: 40 },
      reach: "800K impressions",
    },
    {
      id: 4,
      name: "Multi-Channel Event Campaign",
      goal: "Event",
      channels: ["tv", "streaming", "social"],
      complexity: "professional",
      duration: "4 weeks",
      budget: "3,200,000 NOK",
      channelMix: { tv: 35, streaming: 40, social: 25 },
      reach: "3.5M impressions",
    },
    {
      id: 5,
      name: "Streaming-First Launch",
      goal: "Product Launch",
      channels: ["streaming", "social"],
      complexity: "simple",
      duration: "6 weeks",
      budget: "1,200,000 NOK",
      channelMix: { tv: 0, streaming: 70, social: 30 },
      reach: "1.2M impressions",
    },
    {
      id: 6,
      name: "Premium TV Campaign",
      goal: "Brand Awareness",
      channels: ["tv"],
      complexity: "professional",
      duration: "10 weeks",
      budget: "4,000,000 NOK",
      channelMix: { tv: 100, streaming: 0, social: 0 },
      reach: "4.2M impressions",
    },
  ];

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((c) => c !== channelId)
        : [...prev, channelId]
    );
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesGoal = selectedGoal === "all" || template.goal.toLowerCase().includes(selectedGoal);
    const matchesChannels =
      selectedChannels.length === 0 ||
      selectedChannels.every((ch) => template.channels.includes(ch));
    const matchesComplexity =
      selectedComplexity === "all" || template.complexity === selectedComplexity;

    return matchesGoal && matchesChannels && matchesComplexity;
  });

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <h1
          className="text-card-foreground mb-2"
          style={{
            fontSize: "32px",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-family-display)",
          }}
        >
          Campaign Templates
        </h1>
        <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
          Start with proven campaign structures optimized for your goals
        </p>
      </div>

      {/* Filters */}
      <div className="border-b border-border bg-background px-8 py-4">
        <div className="flex gap-8">
          {/* Goal Filter */}
          <div>
            <div
              className="text-foreground mb-2"
              style={{ fontSize: "12px", fontWeight: "var(--font-weight-semibold)" }}
            >
              Goal
            </div>
            <div className="flex gap-2">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`px-3 py-1.5 rounded-[var(--radius-button)] border transition-colors ${
                    selectedGoal === goal.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-card-foreground border-border hover:border-primary"
                  }`}
                  style={{ fontSize: "13px" }}
                >
                  {goal.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Filter */}
          <div>
            <div
              className="text-foreground mb-2"
              style={{ fontSize: "12px", fontWeight: "var(--font-weight-semibold)" }}
            >
              Channels
            </div>
            <div className="flex gap-2">
              {channels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <button
                    key={channel.id}
                    onClick={() => toggleChannel(channel.id)}
                    className={`px-3 py-1.5 rounded-[var(--radius-button)] border transition-colors flex items-center gap-2 ${
                      selectedChannels.includes(channel.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-card-foreground border-border hover:border-primary"
                    }`}
                    style={{ fontSize: "13px" }}
                  >
                    <Icon size={14} />
                    {channel.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Complexity Filter */}
          <div>
            <div
              className="text-foreground mb-2"
              style={{ fontSize: "12px", fontWeight: "var(--font-weight-semibold)" }}
            >
              Complexity
            </div>
            <div className="flex gap-2">
              {complexities.map((complexity) => (
                <button
                  key={complexity.id}
                  onClick={() => setSelectedComplexity(complexity.id)}
                  className={`px-3 py-1.5 rounded-[var(--radius-button)] border transition-colors ${
                    selectedComplexity === complexity.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-card-foreground border-border hover:border-primary"
                  }`}
                  style={{ fontSize: "13px" }}
                >
                  {complexity.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-card border border-border rounded-[var(--radius-lg)] overflow-hidden hover:border-primary transition-all group"
            >
              {/* Channel Mix Visualization */}
              <div className="h-2 flex">
                {template.channelMix.tv > 0 && (
                  <div
                    className="bg-chart-1"
                    style={{ width: `${template.channelMix.tv}%` }}
                  />
                )}
                {template.channelMix.streaming > 0 && (
                  <div
                    className="bg-chart-2"
                    style={{ width: `${template.channelMix.streaming}%` }}
                  />
                )}
                {template.channelMix.social > 0 && (
                  <div
                    className="bg-chart-3"
                    style={{ width: `${template.channelMix.social}%` }}
                  />
                )}
              </div>

              <div className="p-5">
                {/* Template Name */}
                <h3
                  className="text-card-foreground mb-1 group-hover:text-primary transition-colors"
                  style={{
                    fontSize: "18px",
                    fontWeight: "var(--font-weight-semibold)",
                    fontFamily: "var(--font-family-display)",
                  }}
                >
                  {template.name}
                </h3>

                {/* Goal Badge */}
                <div
                  className="inline-block px-2 py-0.5 rounded-[var(--radius-sm)] bg-accent/10 text-accent mb-4"
                  style={{ fontSize: "11px", fontWeight: "var(--font-weight-semibold)" }}
                >
                  {template.goal}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div
                      className="text-muted-foreground mb-0.5"
                      style={{ fontSize: "11px" }}
                    >
                      Duration
                    </div>
                    <div className="text-card-foreground" style={{ fontSize: "13px" }}>
                      {template.duration}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-muted-foreground mb-0.5"
                      style={{ fontSize: "11px" }}
                    >
                      Budget
                    </div>
                    <div className="text-card-foreground" style={{ fontSize: "13px" }}>
                      {template.budget}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-muted-foreground mb-0.5"
                      style={{ fontSize: "11px" }}
                    >
                      Expected Reach
                    </div>
                    <div className="text-card-foreground" style={{ fontSize: "13px" }}>
                      {template.reach}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-muted-foreground mb-0.5"
                      style={{ fontSize: "11px" }}
                    >
                      Channels
                    </div>
                    <div className="flex gap-1">
                      {template.channels.map((ch) => {
                        const channel = channels.find((c) => c.id === ch);
                        if (!channel) return null;
                        const Icon = channel.icon;
                        return <Icon key={ch} size={14} className="text-card-foreground" />;
                      })}
                    </div>
                  </div>
                </div>

                {/* Budget Distribution */}
                <div className="mb-4">
                  <div
                    className="text-muted-foreground mb-2"
                    style={{ fontSize: "11px" }}
                  >
                    Budget Distribution
                  </div>
                  <div className="space-y-1.5">
                    {template.channelMix.tv > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-12 text-card-foreground" style={{ fontSize: "12px" }}>
                          TV
                        </div>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-chart-1"
                            style={{ width: `${template.channelMix.tv}%` }}
                          />
                        </div>
                        <div className="w-10 text-right text-card-foreground" style={{ fontSize: "12px" }}>
                          {template.channelMix.tv}%
                        </div>
                      </div>
                    )}
                    {template.channelMix.streaming > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-12 text-card-foreground" style={{ fontSize: "12px" }}>
                          Stream
                        </div>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-chart-2"
                            style={{ width: `${template.channelMix.streaming}%` }}
                          />
                        </div>
                        <div className="w-10 text-right text-card-foreground" style={{ fontSize: "12px" }}>
                          {template.channelMix.streaming}%
                        </div>
                      </div>
                    )}
                    {template.channelMix.social > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-12 text-card-foreground" style={{ fontSize: "12px" }}>
                          Social
                        </div>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-chart-3"
                            style={{ width: `${template.channelMix.social}%` }}
                          />
                        </div>
                        <div className="w-10 text-right text-card-foreground" style={{ fontSize: "12px" }}>
                          {template.channelMix.social}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border">
                  <button
                    className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-[var(--radius-button)] hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                    style={{ fontSize: "13px" }}
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                  <Link
                    to={`/campaign/new-${template.id}`}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius-button)] hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    style={{ fontSize: "13px" }}
                  >
                    <Check size={14} />
                    Use Template
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
