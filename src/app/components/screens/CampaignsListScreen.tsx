import React, { useState, useRef } from "react";
import { Link } from "react-router";
import { Plus, Calendar, DollarSign, Target, Trash2, BookmarkPlus, BookmarkCheck, Send, CheckCircle2 } from "lucide-react";
import { ConfirmModal } from "../workspace/ConfirmModal";

interface Campaign {
  id: string;
  name: string;
  advertiser: string;
  agency: string;
  status: "Active" | "Planning" | "Completed";
  statusColor: string;
  startDate: string;
  endDate: string;
  budget: string;
  spent: string;
  progress: number;
  goal: string;
}

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "summer-car-2026",
    name: "Summer Car Launch 2026",
    advertiser: "AutoNordic AS",
    agency: "Media House Norway",
    status: "Active",
    statusColor: "#22c55e",
    startDate: "2026-05-01",
    endDate: "2026-06-30",
    budget: "2 500 000 NOK",
    spent: "1 250 000 NOK",
    progress: 50,
    goal: "Product Launch",
  },
  {
    id: "winter-fashion",
    name: "Winter Fashion Collection",
    advertiser: "Nordic Fashion Group",
    agency: "Creative Media AS",
    status: "Planning",
    statusColor: "#f59e0b",
    startDate: "2026-11-01",
    endDate: "2026-12-31",
    budget: "1 800 000 NOK",
    spent: "0 NOK",
    progress: 0,
    goal: "Brand Awareness",
  },
  {
    id: "spring-sale",
    name: "Spring Sale 2026",
    advertiser: "RetailCo Norge",
    agency: "Media House Norway",
    status: "Completed",
    statusColor: "var(--primary)",
    startDate: "2026-03-01",
    endDate: "2026-04-15",
    budget: "950 000 NOK",
    spent: "950 000 NOK",
    progress: 100,
    goal: "Promotion",
  },
];

const STATUS_BG: Record<Campaign["status"], string> = {
  Active:    "rgba(34,197,94,0.10)",
  Planning:  "rgba(245,158,11,0.10)",
  Completed: "var(--secondary)",
};
const STATUS_COLOR: Record<Campaign["status"], string> = {
  Active:    "#22c55e",
  Planning:  "#f59e0b",
  Completed: "var(--muted-foreground)",
};

export function CampaignsListScreen() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [templateSavedName, setTemplateSavedName] = useState<string | null>(null);
  const [bookedId, setBookedId] = useState<string | null>(null);
  const [bookingToastName, setBookingToastName] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingDeleteCampaign = campaigns.find((c) => c.id === pendingDeleteId);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    setCampaigns((prev) => prev.filter((c) => c.id !== pendingDeleteId));
    setPendingDeleteId(null);
  };

  const handleSaveAsTemplate = (campaign: Campaign, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setTemplateSavedName(campaign.name);
    toastTimerRef.current = setTimeout(() => setTemplateSavedName(null), 2800);
  };

  const handleBook = (campaign: Campaign, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookedId(campaign.id);
    if (bookToastTimerRef.current) clearTimeout(bookToastTimerRef.current);
    setBookingToastName(campaign.name);
    bookToastTimerRef.current = setTimeout(() => setBookingToastName(null), 3000);
  };

  return (
    <div style={{ minHeight: "100%", backgroundColor: "var(--background)" }}>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          padding: "24px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-family-display)",
                fontSize: 32,
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--card-foreground)",
                margin: "0 0 6px",
              }}
            >
              Campaigns
            </h1>
            <p
              style={{
                fontFamily: "var(--font-family-text)",
                fontSize: 14,
                fontWeight: "var(--font-weight-light)",
                color: "var(--muted-foreground)",
                margin: 0,
              }}
            >
              Manage your video advertising campaigns across all channels
            </p>
          </div>

          <Link
            to="/create"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 22px",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              borderRadius: "var(--radius-button)",
              fontFamily: "var(--font-family-text)",
              fontSize: 14,
              fontWeight: "var(--font-weight-semibold)",
              textDecoration: "none",
              transition: "opacity 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Plus size={16} />
            New Campaign
          </Link>
        </div>
      </div>

      {/* ── Campaign list ─────────────────────────────────────────────────── */}
      <div style={{ padding: "32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              style={{ position: "relative" }}
            >
              {/* ── Navigable card area ─────────────────────────────────── */}
              <Link
                to={`/campaign/${campaign.id}`}
                style={{
                  display: "block",
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: campaign.status === "Planning"
                    ? "var(--radius-lg) var(--radius-lg) 0 0"
                    : "var(--radius-lg)",
                  padding: "20px 24px",
                  textDecoration: "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  paddingRight: 120,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.boxShadow = "var(--elevation-sm)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
                  {/* Left: name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-family-display)",
                          fontSize: 20,
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--card-foreground)",
                          transition: "color 0.12s",
                        }}
                      >
                        {campaign.name}
                      </span>
                      {/* Status badge */}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "3px 10px",
                          backgroundColor: STATUS_BG[campaign.status],
                          borderRadius: "var(--radius-button)",
                          fontFamily: "var(--font-family-text)",
                          fontSize: 12,
                          fontWeight: "var(--font-weight-semibold)",
                          color: STATUS_COLOR[campaign.status],
                          flexShrink: 0,
                        }}
                      >
                        {/* Status dot */}
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: STATUS_COLOR[campaign.status],
                            display: "inline-block",
                          }}
                        />
                        {campaign.status}
                      </span>
                      {/* Booked badge */}
                      {bookedId === campaign.id && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 10px",
                            backgroundColor: "var(--status-success-subtle, rgba(34,197,94,0.10))",
                            border: "1px solid var(--status-success, #22c55e)",
                            borderRadius: "var(--radius-button)",
                            fontFamily: "var(--font-family-text)",
                            fontSize: 12,
                            fontWeight: "var(--font-weight-semibold)",
                            color: "var(--status-success, #22c55e)",
                            flexShrink: 0,
                          }}
                        >
                          <CheckCircle2 size={11} />
                          Booked
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        fontFamily: "var(--font-family-text)",
                        fontSize: 13,
                        fontWeight: "var(--font-weight-light)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <span>{campaign.advertiser}</span>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <span>Agency: {campaign.agency}</span>
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
                  {/* Period */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: "var(--font-family-text)",
                        fontSize: 11,
                        fontWeight: "var(--font-weight-light)",
                        color: "var(--muted-foreground)",
                        marginBottom: 4,
                      }}
                    >
                      <Calendar size={12} />
                      Campaign Period
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-family-text)",
                        fontSize: 13,
                        fontWeight: "var(--font-weight-light)",
                        color: "var(--card-foreground)",
                      }}
                    >
                      {new Date(campaign.startDate).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      –{" "}
                      {new Date(campaign.endDate).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: "var(--font-family-text)",
                        fontSize: 11,
                        fontWeight: "var(--font-weight-light)",
                        color: "var(--muted-foreground)",
                        marginBottom: 4,
                      }}
                    >
                      <DollarSign size={12} />
                      Budget / Spent
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-family-text)",
                        fontSize: 13,
                        fontWeight: "var(--font-weight-light)",
                        color: "var(--card-foreground)",
                      }}
                    >
                      {campaign.budget}
                      <span style={{ color: "var(--muted-foreground)" }}> / {campaign.spent}</span>
                    </div>
                  </div>

                  {/* Goal */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: "var(--font-family-text)",
                        fontSize: 11,
                        fontWeight: "var(--font-weight-light)",
                        color: "var(--muted-foreground)",
                        marginBottom: 4,
                      }}
                    >
                      <Target size={12} />
                      Campaign Goal
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-family-text)",
                        fontSize: 13,
                        fontWeight: "var(--font-weight-light)",
                        color: "var(--card-foreground)",
                      }}
                    >
                      {campaign.goal}
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-family-text)",
                        fontSize: 11,
                        fontWeight: "var(--font-weight-light)",
                        color: "var(--muted-foreground)",
                        marginBottom: 4,
                      }}
                    >
                      Progress
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          flex: 1,
                          height: 5,
                          backgroundColor: "var(--secondary)",
                          borderRadius: 99,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${campaign.progress}%`,
                            height: "100%",
                            backgroundColor: "var(--primary)",
                            borderRadius: 99,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-family-text)",
                          fontSize: 13,
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--card-foreground)",
                          minWidth: 36,
                          textAlign: "right",
                        }}
                      >
                        {campaign.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* ── Book Campaign footer (outside Link, seamlessly joined) ── */}
              {campaign.status === "Planning" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  backgroundColor: bookedId === campaign.id
                    ? "var(--status-success-subtle, rgba(34,197,94,0.06))"
                    : "var(--secondary)",
                  border: "1px solid var(--border)",
                  borderTop: "none",
                  borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-family-text)",
                    fontSize: 12,
                    fontWeight: "var(--font-weight-light)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {bookedId === campaign.id
                    ? "Campaign submitted for booking — your traffic team has been notified."
                    : "Ready to go live? Submit this campaign to the booking system."}
                </span>
                <button
                  onClick={(e) => handleBook(campaign, e)}
                  disabled={bookedId === campaign.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "8px 18px",
                    backgroundColor: bookedId === campaign.id
                      ? "var(--secondary)"
                      : "var(--primary)",
                    color: bookedId === campaign.id
                      ? "var(--status-success, #22c55e)"
                      : "var(--primary-foreground)",
                    border: bookedId === campaign.id
                      ? "1px solid var(--status-success, #22c55e)"
                      : "1px solid transparent",
                    borderRadius: "var(--radius-button)",
                    fontFamily: "var(--font-family-text)",
                    fontSize: 13,
                    fontWeight: "var(--font-weight-semibold)",
                    cursor: bookedId === campaign.id ? "default" : "pointer",
                    transition: "opacity 0.12s, background-color 0.2s",
                    flexShrink: 0,
                    opacity: 1,
                  }}
                  onMouseEnter={(e) => {
                    if (bookedId !== campaign.id)
                      e.currentTarget.style.opacity = "0.88";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  {bookedId === campaign.id ? (
                    <>
                      <CheckCircle2 size={14} />
                      Booked
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      Book Campaign
                    </>
                  )}
                </button>
              </div>
              )}

              {/* ── Icon action buttons (top-right, outside Link) ── */}
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {/* Save as template */}
                <ActionButton
                  title="Save as template"
                  hoverColor="var(--primary)"
                  onClick={(e) => handleSaveAsTemplate(campaign, e)}
                >
                  <BookmarkPlus size={15} />
                </ActionButton>

                {/* Delete */}
                <ActionButton
                  title="Delete campaign"
                  hoverColor="var(--destructive)"
                  onClick={(e) => handleDelete(campaign.id, e)}
                >
                  <Trash2 size={15} />
                </ActionButton>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {campaigns.length === 0 && (
            <div
              style={{
                padding: "64px 32px",
                textAlign: "center",
                backgroundColor: "var(--card)",
                border: "1px dashed var(--border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-family-display)",
                  fontSize: 18,
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--muted-foreground)",
                  marginBottom: 8,
                }}
              >
                No campaigns yet
              </div>
              <div
                style={{
                  fontFamily: "var(--font-family-text)",
                  fontSize: 14,
                  fontWeight: "var(--font-weight-light)",
                  color: "var(--muted-foreground)",
                  marginBottom: 20,
                }}
              >
                Create your first campaign to get started
              </div>
              <Link
                to="/create"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 22px",
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                  borderRadius: "var(--radius-button)",
                  fontFamily: "var(--font-family-text)",
                  fontSize: 14,
                  fontWeight: "var(--font-weight-semibold)",
                  textDecoration: "none",
                }}
              >
                <Plus size={16} />
                New Campaign
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      {pendingDeleteId && (
        <ConfirmModal
          title="Delete campaign?"
          message={`"${pendingDeleteCampaign?.name ?? "This campaign"}" and all its associated data will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete campaign"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* ── Booking toast ────────────────────────────────────────────────── */}
      {bookingToastName && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px",
            backgroundColor: "var(--foreground)",
            borderRadius: "var(--radius-button)",
            boxShadow: "0 8px 24px rgba(42, 42, 56, 0.24)",
            animation: "toastIn 0.2s ease-out",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <Send size={14} style={{ color: "var(--status-success, #22c55e)" }} />
          <span
            style={{
              fontFamily: "var(--font-family-text)",
              fontSize: 13,
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--background)",
            }}
          >
            "{bookingToastName}" submitted for booking
          </span>
        </div>
      )}

      {/* ── Template saved toast ──────────────────────────────────────────── */}
      {templateSavedName && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px",
            backgroundColor: "var(--foreground)",
            borderRadius: "var(--radius-button)",
            boxShadow: "0 8px 24px rgba(42, 42, 56, 0.24)",
            animation: "toastIn 0.2s ease-out",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <BookmarkCheck size={15} style={{ color: "var(--status-success)" } as React.CSSProperties} />
          <span
            style={{
              fontFamily: "var(--font-family-text)",
              fontSize: 13,
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--background)",
            }}
          >
            "{templateSavedName}" saved as template
          </span>
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Reusable icon action button ────────────────────────────────────────────────

function ActionButton({
  children,
  title,
  hoverColor,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  hoverColor: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        background: hovered ? "var(--secondary)" : "none",
        border: "1px solid",
        borderColor: hovered ? "var(--border)" : "transparent",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        color: hovered ? hoverColor : "var(--muted-foreground)",
        transition: "color 0.12s, background 0.12s, border-color 0.12s",
      }}
    >
      {children}
    </button>
  );
}