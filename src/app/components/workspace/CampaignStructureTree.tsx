import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Tv,
  Monitor,
  Share2,
  Film,
  Plus,
} from "lucide-react";

interface CampaignStructureTreeProps {
  campaignId: string;
  selectedObject: any;
  onSelectObject: (obj: any) => void;
}

export function CampaignStructureTree({
  campaignId,
  selectedObject,
  onSelectObject,
}: CampaignStructureTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["campaign", "stream-tv", "stream-streaming", "stream-social"])
  );

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const structure = {
    id: "campaign",
    name: "Summer Car Launch 2026",
    type: "campaign",
    icon: FolderOpen,
    children: [
      {
        id: "stream-tv",
        name: "TV Broadcast",
        type: "media-stream",
        icon: Tv,
        budget: "40%",
        children: [
          {
            id: "placement-tv-1",
            name: "Prime Time Slots",
            type: "placement",
            icon: null,
            children: [
              { id: "creative-tv-1", name: "Brand Film 30s", type: "creative", icon: Film },
            ],
          },
          {
            id: "placement-tv-2",
            name: "Daytime Slots",
            type: "placement",
            icon: null,
            children: [
              { id: "creative-tv-2", name: "Product Film 15s", type: "creative", icon: Film },
            ],
          },
        ],
      },
      {
        id: "stream-streaming",
        name: "Streaming Platforms",
        type: "media-stream",
        icon: Monitor,
        budget: "45%",
        children: [
          {
            id: "placement-streaming-1",
            name: "Pre-Roll Ads",
            type: "placement",
            icon: null,
            children: [
              { id: "creative-streaming-1", name: "Brand Film 30s", type: "creative", icon: Film },
              { id: "creative-streaming-2", name: "Product Film 15s", type: "creative", icon: Film },
            ],
          },
        ],
      },
      {
        id: "stream-social",
        name: "Social Video",
        type: "media-stream",
        icon: Share2,
        budget: "15%",
        children: [
          {
            id: "placement-social-1",
            name: "In-Feed Video",
            type: "placement",
            icon: null,
            children: [
              { id: "creative-social-1", name: "Bumper 6s", type: "creative", icon: Film },
            ],
          },
        ],
      },
    ],
  };

  const renderNode = (node: any, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedObject?.id === node.id;
    const Icon = node.icon;

    return (
      <div key={node.id}>
        <div
          onClick={() => onSelectObject({ ...node, id: node.id })}
          className={`
            flex items-center gap-2 px-3 py-1.5 cursor-pointer group rounded-[var(--radius-sm)]
            transition-colors
            ${
              isSelected
                ? "bg-primary/10 text-primary"
                : "text-card-foreground hover:bg-secondary/50"
            }
          `}
          style={{
            paddingLeft: `${12 + depth * 16}px`,
            fontSize: "13px",
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="text-muted-foreground hover:text-card-foreground"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!hasChildren && <div className="w-[14px]" />}

          {/* Node Icon */}
          {Icon && <Icon size={14} className={isSelected ? "text-primary" : "text-muted-foreground"} />}

          {/* Node Name */}
          <span className="flex-1 truncate">{node.name}</span>

          {/* Budget Badge (for media streams) */}
          {node.budget && (
            <span
              className="px-1.5 py-0.5 rounded bg-accent/10 text-accent"
              style={{ fontSize: "11px", fontWeight: "var(--font-weight-semibold)" }}
            >
              {node.budget}
            </span>
          )}
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child: any) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div
          className="text-card-foreground"
          style={{
            fontSize: "14px",
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          Campaign Structure
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto p-2">
        {renderNode(structure)}
      </div>

      {/* Add Buttons */}
      <div className="p-3 border-t border-border space-y-2">
        <button
          className="w-full px-3 py-2 bg-secondary text-secondary-foreground rounded-[var(--radius-md)] hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
          style={{ fontSize: "13px" }}
        >
          <Plus size={14} />
          Add Stream
        </button>
        <button
          className="w-full px-3 py-2 bg-secondary text-secondary-foreground rounded-[var(--radius-md)] hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
          style={{ fontSize: "13px" }}
        >
          <Plus size={14} />
          Add Placement
        </button>
        <button
          className="w-full px-3 py-2 bg-secondary text-secondary-foreground rounded-[var(--radius-md)] hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
          style={{ fontSize: "13px" }}
        >
          <Plus size={14} />
          Add Creative
        </button>
      </div>
    </div>
  );
}
