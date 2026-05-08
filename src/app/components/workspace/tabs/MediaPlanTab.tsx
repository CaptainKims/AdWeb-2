import { useState, useEffect } from "react";
import { ZoomIn, ZoomOut, Calendar, Grid3x3, AlignLeft } from "lucide-react";

interface Flight {
  start: number;
  duration: number;
  budget: number;
  frequency: number;
  creative: string;
}

interface MediaStream {
  id: string;
  name: string;
  color: string;
  flights: Flight[];
}

interface MediaPlanTabProps {
  campaignId: string;
}

export function MediaPlanTab({ campaignId }: MediaPlanTabProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [snapToWeek, setSnapToWeek] = useState(true);

  // Generate weeks for timeline
  const startDate = new Date("2026-05-01");
  const endDate = new Date("2026-06-30");
  const weeks: Date[] = [];
  let currentWeek = new Date(startDate);
  
  while (currentWeek <= endDate) {
    weeks.push(new Date(currentWeek));
    currentWeek.setDate(currentWeek.getDate() + 7);
  }

  const [mediaStreams, setMediaStreams] = useState<MediaStream[]>([
    {
      id: "tv",
      name: "TV Broadcast",
      color: "var(--chart-1)",
      flights: [
        { start: 0, duration: 4, budget: 60, frequency: 3.8, creative: "Brand Film 30s" },
        { start: 5, duration: 3, budget: 40, frequency: 2.5, creative: "Product Film 15s" },
      ],
    },
    {
      id: "streaming",
      name: "Streaming Platforms",
      color: "var(--chart-2)",
      flights: [
        { start: 0, duration: 8, budget: 100, frequency: 4.2, creative: "Brand Film 30s" },
      ],
    },
    {
      id: "social",
      name: "Social Video",
      color: "var(--chart-3)",
      flights: [
        { start: 1, duration: 6, budget: 100, frequency: 5.5, creative: "Bumper 6s" },
      ],
    },
  ]);

  // Drag and resize state
  const [dragState, setDragState] = useState<{
    streamId: string;
    flightIndex: number;
    action: "move" | "resize-left" | "resize-right";
    initialX: number;
    initialStart: number;
    initialDuration: number;
  } | null>(null);

  const handleMouseDown = (
    e: React.MouseEvent,
    streamId: string,
    flightIndex: number,
    action: "move" | "resize-left" | "resize-right"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const stream = mediaStreams.find((s) => s.id === streamId);
    if (!stream) return;
    
    const flight = stream.flights[flightIndex];
    
    setDragState({
      streamId,
      flightIndex,
      action,
      initialX: e.clientX,
      initialStart: flight.start,
      initialDuration: flight.duration,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragState) return;

    const container = document.querySelector(`[data-timeline-track="${dragState.streamId}"]`);
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const totalWeeks = weeks.length;
    const pixelsPerWeek = rect.width / totalWeeks;
    const deltaX = e.clientX - dragState.initialX;
    const deltaWeeks = deltaX / pixelsPerWeek;

    let newStart = dragState.initialStart;
    let newDuration = dragState.initialDuration;

    if (dragState.action === "move") {
      newStart = dragState.initialStart + deltaWeeks;
      
      // Snap to week if enabled
      if (snapToWeek) {
        newStart = Math.round(newStart);
      }
      
      // Constrain within bounds
      newStart = Math.max(0, Math.min(totalWeeks - dragState.initialDuration, newStart));
    } else if (dragState.action === "resize-left") {
      const change = deltaWeeks;
      newStart = dragState.initialStart + change;
      newDuration = dragState.initialDuration - change;
      
      if (snapToWeek) {
        const snappedStart = Math.round(newStart);
        const snappedDuration = dragState.initialDuration - (snappedStart - dragState.initialStart);
        newStart = snappedStart;
        newDuration = snappedDuration;
      }
      
      // Minimum duration of 1 week
      if (newDuration < 1) {
        newDuration = 1;
        newStart = dragState.initialStart + dragState.initialDuration - 1;
      }
      
      // Constrain within bounds
      newStart = Math.max(0, newStart);
    } else if (dragState.action === "resize-right") {
      newDuration = dragState.initialDuration + deltaWeeks;
      
      if (snapToWeek) {
        newDuration = Math.round(newDuration);
      }
      
      // Minimum duration of 1 week
      newDuration = Math.max(1, newDuration);
      
      // Constrain within bounds
      newDuration = Math.min(totalWeeks - dragState.initialStart, newDuration);
    }

    // Update the flight
    setMediaStreams((prev) =>
      prev.map((stream) =>
        stream.id === dragState.streamId
          ? {
              ...stream,
              flights: stream.flights.map((flight, index) =>
                index === dragState.flightIndex
                  ? { ...flight, start: newStart, duration: newDuration }
                  : flight
              ),
            }
          : stream
      )
    );
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  // Add global event listeners for drag
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragState) {
        handleMouseMove(e);
      }
    };

    const handleGlobalMouseUp = () => {
      if (dragState) {
        handleMouseUp();
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [dragState]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${
                viewMode === "week"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
              style={{ fontSize: "13px" }}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${
                viewMode === "month"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
              style={{ fontSize: "13px" }}
            >
              Month
            </button>
          </div>

          {/* Snap to Week */}
          <label className="flex items-center gap-2 text-card-foreground cursor-pointer" style={{ fontSize: "13px" }}>
            <input
              type="checkbox"
              checked={snapToWeek}
              onChange={(e) => setSnapToWeek(e.target.checked)}
              className="rounded"
            />
            <span>Snap to week</span>
          </label>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
            className="p-2 text-card-foreground hover:bg-secondary rounded-[var(--radius-md)] transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <div className="text-card-foreground px-3" style={{ fontSize: "13px" }}>
            {Math.round(zoomLevel * 100)}%
          </div>
          <button
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
            className="p-2 text-card-foreground hover:bg-secondary rounded-[var(--radius-md)} transition-colors"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto p-6">
        <div className="min-w-[800px]">
          {/* Timeline Header */}
          <div className="flex mb-4">
            <div className="w-[200px] flex-shrink-0" />
            <div className="flex-1 flex">
              {weeks.map((week, index) => (
                <div
                  key={index}
                  className="flex-1 text-center border-l border-border px-2 py-2"
                  style={{ fontSize: "12px" }}
                >
                  <div className="text-card-foreground" style={{ fontWeight: "var(--font-weight-semibold)" }}>
                    Week {index + 1}
                  </div>
                  <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
                    {week.toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Rows */}
          <div className="space-y-4">
            {mediaStreams.map((stream) => (
              <div key={stream.id} className="flex">
                {/* Stream Label */}
                <div className="w-[200px] flex-shrink-0 pr-4">
                  <div
                    className="h-full bg-card border border-border rounded-[var(--radius-md)] p-3 flex items-center"
                  >
                    <div>
                      <div
                        className="text-card-foreground mb-1"
                        style={{ fontSize: "14px", fontWeight: "var(--font-weight-semibold)" }}
                      >
                        {stream.name}
                      </div>
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: stream.color }}
                      />
                    </div>
                  </div>
                </div>

                {/* Timeline Track */}
                <div className="flex-1 relative h-[80px] bg-card border border-border rounded-[var(--radius-md)]" data-timeline-track={stream.id}>
                  {/* Week Grid Lines */}
                  <div className="absolute inset-0 flex">
                    {weeks.map((_, index) => (
                      <div
                        key={index}
                        className="flex-1 border-l border-border/30"
                        style={{ marginLeft: index === 0 ? 0 : undefined }}
                      />
                    ))}
                  </div>

                  {/* Flight Bars */}
                  {stream.flights.map((flight, flightIndex) => {
                    const totalWeeks = weeks.length;
                    const left = (flight.start / totalWeeks) * 100;
                    const width = (flight.duration / totalWeeks) * 100;

                    return (
                      <div
                        key={flightIndex}
                        className="absolute top-2 bottom-2 rounded-[var(--radius-sm)] cursor-move hover:ring-2 hover:ring-ring transition-shadow group"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: stream.color,
                        }}
                        onMouseDown={(e) => handleMouseDown(e, stream.id, flightIndex, "move")}
                      >
                        <div className="h-full p-2 flex flex-col justify-between">
                          <div
                            className="text-primary-foreground"
                            style={{ fontSize: "12px", fontWeight: "var(--font-weight-semibold)" }}
                          >
                            Budget: {flight.budget}%
                          </div>
                          <div
                            className="text-primary-foreground/80"
                            style={{ fontSize: "11px" }}
                          >
                            Freq: {flight.frequency} • {flight.creative}
                          </div>
                        </div>

                        {/* Resize Handles */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 z-10"
                          onMouseDown={(e) => handleMouseDown(e, stream.id, flightIndex, "resize-left")}
                          style={{ 
                            background: 'linear-gradient(to right, rgba(255,255,255,0.4), transparent)'
                          }}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 z-10"
                          onMouseDown={(e) => handleMouseDown(e, stream.id, flightIndex, "resize-right")}
                          style={{ 
                            background: 'linear-gradient(to left, rgba(255,255,255,0.4), transparent)'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-8 p-4 bg-card border border-border rounded-[var(--radius-lg)]">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2" style={{ fontSize: "12px" }}>
                <div className="w-3 h-3 rounded bg-[#22c55e]" />
                <span className="text-card-foreground">High Availability</span>
              </div>
              <div className="flex items-center gap-2" style={{ fontSize: "12px" }}>
                <div className="w-3 h-3 rounded bg-[#f59e0b]" />
                <span className="text-card-foreground">Medium Pressure</span>
              </div>
              <div className="flex items-center gap-2" style={{ fontSize: "12px" }}>
                <div className="w-3 h-3 rounded bg-destructive" />
                <span className="text-card-foreground">High Pressure</span>
              </div>
              <div className="ml-auto text-muted-foreground" style={{ fontSize: "12px" }}>
                💡 Drag to move flights • Resize from edges • Click to select
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}