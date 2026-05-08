import { OverviewTab } from "./tabs/OverviewTab";
import { MediaPlanTab } from "./tabs/MediaPlanTab";
import { CreativesTab } from "./tabs/CreativesTab";
import { BudgetTab } from "./tabs/BudgetTab";
import { ForecastTab } from "./tabs/ForecastTab";
import { ReviewTab } from "./tabs/ReviewTab";

interface WorkspaceTabsProps {
  selectedTab: string;
  onSelectTab: (tab: string) => void;
  campaignId: string;
  selectedObject: any;
}

export function WorkspaceTabs({
  selectedTab,
  onSelectTab,
  campaignId,
  selectedObject,
}: WorkspaceTabsProps) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "media-plan", label: "Media Plan" },
    { id: "creatives", label: "Creatives" },
    { id: "budget", label: "Budget" },
    { id: "forecast", label: "Forecast" },
    { id: "review", label: "Review" },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tab Navigation */}
      <div className="border-b border-border bg-card">
        <div className="flex px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`
                px-4 py-3 border-b-2 transition-colors
                ${
                  selectedTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-card-foreground"
                }
              `}
              style={{
                fontSize: "14px",
                fontWeight: selectedTab === tab.id ? "var(--font-weight-semibold)" : "normal",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {selectedTab === "overview" && <OverviewTab campaignId={campaignId} />}
        {selectedTab === "media-plan" && <MediaPlanTab campaignId={campaignId} />}
        {selectedTab === "creatives" && <CreativesTab campaignId={campaignId} />}
        {selectedTab === "budget" && <BudgetTab campaignId={campaignId} />}
        {selectedTab === "forecast" && <ForecastTab campaignId={campaignId} />}
        {selectedTab === "review" && <ReviewTab campaignId={campaignId} />}
      </div>
    </div>
  );
}
