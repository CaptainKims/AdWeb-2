import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  DollarSign,
  Target,
  Tv,
  Monitor,
  Share2,
  Film,
  Send,
  Save,
} from "lucide-react";

interface ReviewTabProps {
  campaignId: string;
}

export function ReviewTab({ campaignId }: ReviewTabProps) {
  const validationItems = [
    { label: "Campaign details complete", status: "valid", message: "All required fields filled" },
    { label: "Budget allocated", status: "valid", message: "100% budget allocated across channels" },
    { label: "Media streams configured", status: "valid", message: "3 media streams configured" },
    { label: "Placements defined", status: "warning", message: "2 of 3 placements missing targeting" },
    { label: "Creatives assigned", status: "warning", message: "1 placement missing creative assignment" },
    { label: "Dates validated", status: "valid", message: "No date conflicts detected" },
    { label: "Inventory availability", status: "valid", message: "All inventory available" },
  ];

  const statusConfig = {
    valid: { icon: CheckCircle, color: "text-[#22c55e]", bg: "bg-[#22c55e]/10" },
    warning: { icon: AlertCircle, color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/10" },
    error: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h2
          className="text-foreground mb-2"
          style={{
            fontSize: "28px",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-family-display)",
          }}
        >
          Review & Submit Campaign
        </h2>
        <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
          Review your campaign details and resolve any issues before submitting your order
        </p>
      </div>

      {/* Validation Status */}
      <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6 mb-8">
        <h3
          className="text-card-foreground mb-4"
          style={{ fontSize: "18px", fontWeight: "var(--font-weight-semibold)" }}
        >
          Campaign Validation
        </h3>
        <div className="space-y-3">
          {validationItems.map((item, index) => {
            const config = statusConfig[item.status as keyof typeof statusConfig];
            const Icon = config.icon;

            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-[var(--radius-md)] ${config.bg}`}
              >
                <Icon size={18} className={config.color} />
                <div className="flex-1">
                  <div className="text-card-foreground" style={{ fontSize: "14px", fontWeight: "var(--font-weight-semibold)" }}>
                    {item.label}
                  </div>
                  <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                    {item.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaign Summary */}
      <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6 mb-6">
        <h3
          className="text-card-foreground mb-4"
          style={{ fontSize: "18px", fontWeight: "var(--font-weight-semibold)" }}
        >
          Campaign Summary
        </h3>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <div className="text-muted-foreground mb-1" style={{ fontSize: "12px" }}>
                Campaign Name
              </div>
              <div className="text-card-foreground" style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}>
                Summer Car Launch 2026
              </div>
            </div>

            <div>
              <div className="text-muted-foreground mb-1" style={{ fontSize: "12px" }}>
                Advertiser
              </div>
              <div className="text-card-foreground" style={{ fontSize: "14px" }}>
                AutoNordic AS
              </div>
            </div>

            <div>
              <div className="text-muted-foreground mb-1" style={{ fontSize: "12px" }}>
                Agency
              </div>
              <div className="text-card-foreground" style={{ fontSize: "14px" }}>
                Media House Norway
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <div>
                <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                  Campaign Period
                </div>
                <div className="text-card-foreground" style={{ fontSize: "14px" }}>
                  May 1, 2026 - June 30, 2026 (8 weeks)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-muted-foreground" />
              <div>
                <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                  Total Budget
                </div>
                <div className="text-card-foreground" style={{ fontSize: "14px", fontWeight: "var(--font-weight-semibold)" }}>
                  2,500,000 NOK
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Target size={16} className="text-muted-foreground" />
              <div>
                <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                  Campaign Goal
                </div>
                <div className="text-card-foreground" style={{ fontSize: "14px" }}>
                  Product Launch
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Plan Summary */}
      <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6 mb-6">
        <h3
          className="text-card-foreground mb-4"
          style={{ fontSize: "18px", fontWeight: "var(--font-weight-semibold)" }}
        >
          Media Plan Summary
        </h3>

        <div className="space-y-4">
          {/* TV Broadcast */}
          <div className="border border-border rounded-[var(--radius-md)] p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-chart-1/10 flex items-center justify-center">
                <Tv size={20} className="text-[var(--chart-1)]" />
              </div>
              <div className="flex-1">
                <div className="text-card-foreground" style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}>
                  TV Broadcast
                </div>
                <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                  40% • 1,000,000 NOK
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Placements:</span>{" "}
                <span className="text-card-foreground" style={{ fontSize: "12px" }}>2 (Prime Time, Daytime)</span>
              </div>
              <div>
                <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Creatives:</span>{" "}
                <span className="text-card-foreground" style={{ fontSize: "12px" }}>2 assigned</span>
              </div>
            </div>
          </div>

          {/* Streaming */}
          <div className="border border-border rounded-[var(--radius-md)] p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-chart-2/10 flex items-center justify-center">
                <Monitor size={20} className="text-[var(--chart-2)]" />
              </div>
              <div className="flex-1">
                <div className="text-card-foreground" style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}>
                  Streaming Platforms
                </div>
                <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                  45% • 1,125,000 NOK
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Placements:</span>{" "}
                <span className="text-card-foreground" style={{ fontSize: "12px" }}>1 (Pre-Roll)</span>
              </div>
              <div>
                <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Creatives:</span>{" "}
                <span className="text-card-foreground" style={{ fontSize: "12px" }}>2 assigned</span>
              </div>
            </div>
          </div>

          {/* Social */}
          <div className="border border-border rounded-[var(--radius-md)] p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-chart-3/10 flex items-center justify-center">
                <Share2 size={20} className="text-[var(--chart-3)]" />
              </div>
              <div className="flex-1">
                <div className="text-card-foreground" style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}>
                  Social Video
                </div>
                <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                  15% • 375,000 NOK
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Placements:</span>{" "}
                <span className="text-card-foreground" style={{ fontSize: "12px" }}>1 (In-Feed Video)</span>
              </div>
              <div>
                <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Creatives:</span>{" "}
                <span className="text-card-foreground" style={{ fontSize: "12px" }}>1 assigned</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Creatives Used */}
      <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6 mb-8">
        <h3
          className="text-card-foreground mb-4"
          style={{ fontSize: "18px", fontWeight: "var(--font-weight-semibold)" }}
        >
          Creatives Used
        </h3>

        <div className="grid grid-cols-3 gap-4">
          {[
            { name: "Brand Film 30s", duration: "30s", placements: 2 },
            { name: "Product Film 15s", duration: "15s", placements: 2 },
            { name: "Bumper 6s", duration: "6s", placements: 1 },
          ].map((creative, index) => (
            <div
              key={index}
              className="border border-border rounded-[var(--radius-md)] p-4 flex items-start gap-3"
            >
              <div className="w-12 h-12 bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center text-2xl">
                🎬
              </div>
              <div className="flex-1">
                <div className="text-card-foreground mb-1" style={{ fontSize: "14px", fontWeight: "var(--font-weight-semibold)" }}>
                  {creative.name}
                </div>
                <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                  {creative.duration} • Used in {creative.placements} placements
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <button
          className="px-6 py-3 bg-secondary text-secondary-foreground rounded-[var(--radius-button)] hover:bg-secondary/80 transition-colors flex items-center gap-2"
          style={{ fontSize: "14px", fontWeight: "var(--font-weight-semibold)" }}
        >
          <Save size={18} />
          Save Draft
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right mr-4">
            <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
              2 warnings to resolve
            </div>
            <div className="text-card-foreground" style={{ fontSize: "13px" }}>
              Campaign is ready to submit
            </div>
          </div>
          <button
            className="px-8 py-3 bg-primary text-primary-foreground rounded-[var(--radius-button)] hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg"
            style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}
          >
            <Send size={20} />
            Submit Order
          </button>
        </div>
      </div>
    </div>
  );
}
