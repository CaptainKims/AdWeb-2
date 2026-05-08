import { useState } from "react";
import { Upload, Grid3x3, List, Filter, Clock, CheckCircle, Film } from "lucide-react";

interface CreativesTabProps {
  campaignId: string;
}

export function CreativesTab({ campaignId }: CreativesTabProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterLength, setFilterLength] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const creatives = [
    {
      id: 1,
      name: "Brand Film 30s",
      duration: "30s",
      format: "16:9",
      status: "approved",
      version: "v2.1",
      compatibility: ["TV", "Streaming"],
      thumbnail: "🎬",
      uploadDate: "2026-04-15",
    },
    {
      id: 2,
      name: "Product Film 15s",
      duration: "15s",
      format: "16:9",
      status: "approved",
      version: "v1.5",
      compatibility: ["TV", "Streaming", "Social"],
      thumbnail: "🎥",
      uploadDate: "2026-04-18",
    },
    {
      id: 3,
      name: "Bumper 6s",
      duration: "6s",
      format: "1:1",
      status: "approved",
      version: "v1.0",
      compatibility: ["Social"],
      thumbnail: "📱",
      uploadDate: "2026-04-20",
    },
    {
      id: 4,
      name: "Social Teaser 10s",
      duration: "10s",
      format: "9:16",
      status: "pending",
      version: "v1.0",
      compatibility: ["Social"],
      thumbnail: "📲",
      uploadDate: "2026-04-22",
    },
    {
      id: 5,
      name: "Extended Cut 60s",
      duration: "60s",
      format: "16:9",
      status: "review",
      version: "v1.2",
      compatibility: ["Streaming"],
      thumbnail: "🎞️",
      uploadDate: "2026-04-25",
    },
  ];

  const statusColors = {
    approved: { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]", label: "Approved" },
    pending: { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]", label: "Pending" },
    review: { bg: "bg-accent/10", text: "text-accent", label: "In Review" },
  };

  const filteredCreatives = creatives.filter((creative) => {
    const matchesLength = filterLength === "all" || creative.duration === filterLength;
    const matchesStatus = filterStatus === "all" || creative.status === filterStatus;
    return matchesLength && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-secondary rounded-[var(--radius-md)] p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-[var(--radius-sm)] transition-colors ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground hover:text-card-foreground"
              }`}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-[var(--radius-sm)] transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground hover:text-card-foreground"
              }`}
            >
              <List size={16} />
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={filterLength}
              onChange={(e) => setFilterLength(e.target.value)}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-[var(--radius-md)]"
              style={{ fontSize: "13px" }}
            >
              <option value="all">All Lengths</option>
              <option value="6s">6 seconds</option>
              <option value="10s">10 seconds</option>
              <option value="15s">15 seconds</option>
              <option value="30s">30 seconds</option>
              <option value="60s">60 seconds</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-[var(--radius-md)]"
              style={{ fontSize: "13px" }}
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="review">In Review</option>
            </select>
          </div>
        </div>

        {/* Upload Button */}
        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius-button)] hover:bg-primary/90 transition-colors flex items-center gap-2"
          style={{ fontSize: "13px", fontWeight: "var(--font-weight-semibold)" }}
        >
          <Upload size={16} />
          Upload Creative
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-3 gap-6">
            {filteredCreatives.map((creative) => {
              const statusStyle = statusColors[creative.status as keyof typeof statusColors];

              return (
                <div
                  key={creative.id}
                  className="bg-card border border-border rounded-[var(--radius-lg)] overflow-hidden hover:border-primary transition-all cursor-move group"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-secondary flex items-center justify-center text-6xl border-b border-border">
                    {creative.thumbnail}
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4
                        className="text-card-foreground flex-1 group-hover:text-primary transition-colors"
                        style={{ fontSize: "15px", fontWeight: "var(--font-weight-semibold)" }}
                      >
                        {creative.name}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-[var(--radius-sm)] ${statusStyle.bg} ${statusStyle.text}`}
                        style={{ fontSize: "11px", fontWeight: "var(--font-weight-semibold)" }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
                          Duration
                        </div>
                        <div className="text-card-foreground" style={{ fontSize: "13px" }}>
                          {creative.duration}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
                          Format
                        </div>
                        <div className="text-card-foreground" style={{ fontSize: "13px" }}>
                          {creative.format}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
                          Version
                        </div>
                        <div className="text-card-foreground" style={{ fontSize: "13px" }}>
                          {creative.version}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
                          Uploaded
                        </div>
                        <div className="text-card-foreground" style={{ fontSize: "13px" }}>
                          {new Date(creative.uploadDate).toLocaleDateString("nb-NO", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Compatibility */}
                    <div>
                      <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>
                        Compatible With
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {creative.compatibility.map((platform) => (
                          <span
                            key={platform}
                            className="px-2 py-0.5 bg-accent/10 text-accent rounded-[var(--radius-sm)]"
                            style={{ fontSize: "11px" }}
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredCreatives.map((creative) => {
              const statusStyle = statusColors[creative.status as keyof typeof statusColors];

              return (
                <div
                  key={creative.id}
                  className="bg-card border border-border rounded-[var(--radius-md)] p-4 hover:border-primary transition-all cursor-pointer group flex items-center gap-4"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-12 bg-secondary flex items-center justify-center text-2xl rounded-[var(--radius-sm)] border border-border flex-shrink-0">
                    {creative.thumbnail}
                  </div>

                  {/* Name */}
                  <div className="flex-1">
                    <div
                      className="text-card-foreground group-hover:text-primary transition-colors"
                      style={{ fontSize: "14px", fontWeight: "var(--font-weight-semibold)" }}
                    >
                      {creative.name}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2 text-muted-foreground" style={{ fontSize: "13px" }}>
                    <Clock size={14} />
                    <span>{creative.duration}</span>
                  </div>

                  {/* Format */}
                  <div className="text-card-foreground" style={{ fontSize: "13px", width: "60px" }}>
                    {creative.format}
                  </div>

                  {/* Version */}
                  <div className="text-muted-foreground" style={{ fontSize: "13px", width: "60px" }}>
                    {creative.version}
                  </div>

                  {/* Compatibility */}
                  <div className="flex gap-1" style={{ width: "180px" }}>
                    {creative.compatibility.map((platform) => (
                      <span
                        key={platform}
                        className="px-2 py-0.5 bg-accent/10 text-accent rounded-[var(--radius-sm)]"
                        style={{ fontSize: "11px" }}
                      >
                        {platform}
                      </span>
                    ))}
                  </div>

                  {/* Status */}
                  <div style={{ width: "100px" }}>
                    <span
                      className={`px-2.5 py-1 rounded-[var(--radius-button)] ${statusStyle.bg} ${statusStyle.text}`}
                      style={{ fontSize: "12px", fontWeight: "var(--font-weight-semibold)" }}
                    >
                      {statusStyle.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
