import { Calendar, DollarSign, Target, TrendingUp, Clock, MapPin } from "lucide-react";

interface PropertyPanelProps {
  selectedObject: any;
}

export function PropertyPanel({ selectedObject }: PropertyPanelProps) {
  if (!selectedObject) {
    return (
      <div className="h-full bg-card border-l border-border flex items-center justify-center p-6">
        <p className="text-muted-foreground text-center" style={{ fontSize: "13px" }}>
          Select an object to view its properties
        </p>
      </div>
    );
  }

  const renderCampaignProperties = () => (
    <div className="space-y-4">
      {/* Start Date */}
      <div>
        <label className="flex items-center gap-2 text-card-foreground mb-2" style={{ fontSize: "12px" }}>
          <Calendar size={14} />
          Start Date
        </label>
        <input
          type="date"
          defaultValue={selectedObject.data?.startDate}
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        />
      </div>

      {/* End Date */}
      <div>
        <label className="flex items-center gap-2 text-card-foreground mb-2" style={{ fontSize: "12px" }}>
          <Calendar size={14} />
          End Date
        </label>
        <input
          type="date"
          defaultValue={selectedObject.data?.endDate}
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        />
      </div>

      {/* Budget */}
      <div>
        <label className="flex items-center gap-2 text-card-foreground mb-2" style={{ fontSize: "12px" }}>
          <DollarSign size={14} />
          Total Budget (NOK)
        </label>
        <input
          type="text"
          defaultValue={selectedObject.data?.budget}
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        />
      </div>

      {/* Goal */}
      <div>
        <label className="flex items-center gap-2 text-card-foreground mb-2" style={{ fontSize: "12px" }}>
          <Target size={14} />
          Campaign Goal
        </label>
        <select
          defaultValue={selectedObject.data?.goal}
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        >
          <option>Product Launch</option>
          <option>Brand Awareness</option>
          <option>Promotion</option>
          <option>Event</option>
          <option>Always On</option>
        </select>
      </div>
    </div>
  );

  const renderMediaStreamProperties = () => (
    <div className="space-y-4">
      {/* Channel Type */}
      <div>
        <label className="text-card-foreground mb-2 block" style={{ fontSize: "12px" }}>
          Channel Type
        </label>
        <select
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        >
          <option>Broadcast TV</option>
          <option>Streaming</option>
          <option>Social Video</option>
        </select>
      </div>

      {/* Budget Allocation */}
      <div>
        <label className="flex items-center gap-2 text-card-foreground mb-2" style={{ fontSize: "12px" }}>
          <DollarSign size={14} />
          Budget Allocation (%)
        </label>
        <input
          type="range"
          min="0"
          max="100"
          defaultValue={selectedObject.budget?.replace("%", "") || "40"}
          className="w-full"
        />
        <div className="flex justify-between mt-1">
          <span className="text-muted-foreground" style={{ fontSize: "11px" }}>0%</span>
          <span className="text-card-foreground" style={{ fontSize: "13px", fontWeight: "var(--font-weight-semibold)" }}>
            {selectedObject.budget || "40%"}
          </span>
          <span className="text-muted-foreground" style={{ fontSize: "11px" }}>100%</span>
        </div>
      </div>

      {/* Frequency Target */}
      <div>
        <label className="flex items-center gap-2 text-card-foreground mb-2" style={{ fontSize: "12px" }}>
          <TrendingUp size={14} />
          Frequency Target
        </label>
        <input
          type="number"
          defaultValue="3.5"
          step="0.1"
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        />
      </div>

      {/* Reach Estimate */}
      <div className="p-3 bg-accent/5 border border-accent/20 rounded-[var(--radius-md)]">
        <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>
          Estimated Reach
        </div>
        <div className="text-accent" style={{ fontSize: "16px", fontWeight: "var(--font-weight-semibold)" }}>
          1,250,000 impressions
        </div>
      </div>
    </div>
  );

  const renderPlacementProperties = () => (
    <div className="space-y-4">
      {/* Format */}
      <div>
        <label className="text-card-foreground mb-2 block" style={{ fontSize: "12px" }}>
          Ad Format
        </label>
        <select
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        >
          <option>Pre-Roll</option>
          <option>Mid-Roll</option>
          <option>Post-Roll</option>
          <option>In-Feed</option>
          <option>In-Stream</option>
        </select>
      </div>

      {/* Duration */}
      <div>
        <label className="flex items-center gap-2 text-card-foreground mb-2" style={{ fontSize: "12px" }}>
          <Clock size={14} />
          Duration (seconds)
        </label>
        <select
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        >
          <option>6</option>
          <option>15</option>
          <option>30</option>
          <option>60</option>
        </select>
      </div>

      {/* Dayparting */}
      <div>
        <label className="text-card-foreground mb-2 block" style={{ fontSize: "12px" }}>
          Dayparting
        </label>
        <select
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        >
          <option>All Day</option>
          <option>Morning (06:00-12:00)</option>
          <option>Afternoon (12:00-18:00)</option>
          <option>Prime Time (18:00-23:00)</option>
          <option>Late Night (23:00-06:00)</option>
        </select>
      </div>

      {/* Targeting */}
      <div>
        <label className="flex items-center gap-2 text-card-foreground mb-2" style={{ fontSize: "12px" }}>
          <MapPin size={14} />
          Geographic Targeting
        </label>
        <select
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        >
          <option>All Norway</option>
          <option>Oslo Region</option>
          <option>Bergen Region</option>
          <option>Trondheim Region</option>
          <option>Custom</option>
        </select>
      </div>

      {/* Inventory Status */}
      <div className="p-3 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-[var(--radius-md)]">
        <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>
          Inventory Availability
        </div>
        <div className="text-[#22c55e]" style={{ fontSize: "13px", fontWeight: "var(--font-weight-semibold)" }}>
          ✓ High Availability
        </div>
      </div>
    </div>
  );

  const renderCreativeProperties = () => (
    <div className="space-y-4">
      {/* Creative Name */}
      <div>
        <label className="text-card-foreground mb-2 block" style={{ fontSize: "12px" }}>
          Creative Name
        </label>
        <input
          type="text"
          defaultValue={selectedObject.name}
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        />
      </div>

      {/* Length */}
      <div>
        <label className="flex items-center gap-2 text-card-foreground mb-2" style={{ fontSize: "12px" }}>
          <Clock size={14} />
          Length
        </label>
        <select
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        >
          <option>6s</option>
          <option>15s</option>
          <option>30s</option>
          <option>60s</option>
        </select>
      </div>

      {/* Version */}
      <div>
        <label className="text-card-foreground mb-2 block" style={{ fontSize: "12px" }}>
          Version
        </label>
        <input
          type="text"
          defaultValue="v1.0"
          className="w-full px-3 py-2 bg-input-background border border-border rounded-[var(--radius-md)] text-card-foreground"
          style={{ fontSize: "13px" }}
        />
      </div>

      {/* Format Compatibility */}
      <div>
        <label className="text-card-foreground mb-2 block" style={{ fontSize: "12px" }}>
          Format Compatibility
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-card-foreground" style={{ fontSize: "13px" }}>
            <input type="checkbox" defaultChecked className="rounded" />
            <span>TV Broadcast</span>
          </label>
          <label className="flex items-center gap-2 text-card-foreground" style={{ fontSize: "13px" }}>
            <input type="checkbox" defaultChecked className="rounded" />
            <span>Streaming</span>
          </label>
          <label className="flex items-center gap-2 text-card-foreground" style={{ fontSize: "13px" }}>
            <input type="checkbox" className="rounded" />
            <span>Social Video</span>
          </label>
        </div>
      </div>

      {/* Approval Status */}
      <div className="p-3 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-[var(--radius-md)]">
        <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>
          Approval Status
        </div>
        <div className="text-[#22c55e]" style={{ fontSize: "13px", fontWeight: "var(--font-weight-semibold)" }}>
          ✓ Approved
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div
          className="text-card-foreground mb-1"
          style={{
            fontSize: "14px",
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          Properties
        </div>
        <div className="text-muted-foreground truncate" style={{ fontSize: "12px" }}>
          {selectedObject.name}
        </div>
      </div>

      {/* Properties Form */}
      <div className="flex-1 overflow-auto p-4">
        {selectedObject.type === "campaign" && renderCampaignProperties()}
        {selectedObject.type === "media-stream" && renderMediaStreamProperties()}
        {selectedObject.type === "placement" && renderPlacementProperties()}
        {selectedObject.type === "creative" && renderCreativeProperties()}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <button
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius-button)] hover:bg-primary/90 transition-colors"
          style={{ fontSize: "13px", fontWeight: "var(--font-weight-semibold)" }}
        >
          Save Changes
        </button>
        <button
          className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-[var(--radius-button)] hover:bg-secondary/80 transition-colors"
          style={{ fontSize: "13px" }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
