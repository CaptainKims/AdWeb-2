import React, { ComponentType } from 'react';
import { Film, Layers, Calendar, GripVertical, Info, Target } from 'lucide-react';
import { ContainerType } from './types';

interface RepositoryItem {
  type: ContainerType;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  dropHint: string;
}

const ITEMS: RepositoryItem[] = [
  {
    type: 'order',
    label: 'Order',
    description: 'Planning unit — receives a share of the campaign budget',
    icon: Layers,
    accentColor: 'var(--primary)',
    dropHint: 'Drop onto canvas',
  },
  {
    type: 'flight',
    label: 'Flight',
    description: 'Channel & period within an order',
    icon: Calendar,
    accentColor: 'var(--chart-3)',
    dropHint: 'Drop onto Order',
  },
  {
    type: 'creative',
    label: 'Creative',
    description: 'Ad asset assigned to a flight',
    icon: Film,
    accentColor: 'var(--chart-5)',
    dropHint: 'Drop onto Flight',
  },
  {
    type: 'targeting',
    label: 'Targeting',
    description: 'Geo & demographic audience rules',
    icon: Target,
    accentColor: 'var(--chart-2)',
    dropHint: 'Drop onto Order or Flight',
  },
];

export function ContainerRepository() {
  const handleDragStart = (e: React.DragEvent, type: ContainerType) => {
    e.dataTransfer.setData('containerType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        backgroundColor: 'var(--sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-family-display)',
            fontSize: 13,
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--sidebar-foreground)',
            marginBottom: 2,
          }}
        >
          Container Library
        </div>
        <div
          style={{
            fontFamily: 'var(--font-family-text)',
            fontSize: 11,
            fontWeight: 'var(--font-weight-light)',
            color: 'var(--muted-foreground)',
          }}
        >
          Drag to canvas to build your order
        </div>
      </div>

      {/* Container items */}
      <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => handleDragStart(e, item.type)}
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                cursor: 'grab',
                userSelect: 'none',
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--elevation-sm)';
                (e.currentTarget as HTMLDivElement).style.borderColor = item.accentColor;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: item.accentColor + '18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} style={{ color: item.accentColor }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-family-text)',
                      fontSize: 13,
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--sidebar-foreground)',
                    }}
                  >
                    {item.label}
                  </div>
                </div>
                <GripVertical size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-family-text)',
                  fontSize: 11,
                  fontWeight: 'var(--font-weight-light)',
                  color: 'var(--muted-foreground)',
                  marginBottom: 4,
                }}
              >
                {item.description}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: item.accentColor + '12',
                  borderRadius: 99,
                  padding: '2px 8px',
                }}
              >
                <Info size={10} style={{ color: item.accentColor }} />
                <span
                  style={{
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 10,
                    fontWeight: 'var(--font-weight-light)',
                    color: item.accentColor,
                  }}
                >
                  {item.dropHint}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div
        style={{
          margin: '0 10px 12px',
          padding: '10px 12px',
          backgroundColor: 'var(--primary)',
          borderRadius: 'var(--radius-md)',
          opacity: 0.85,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-family-text)',
            fontSize: 11,
            fontWeight: 'var(--font-weight-light)',
            color: 'var(--primary-foreground)',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>Tip:</strong> Click any
          container to edit its properties in the panel on the right.
        </div>
      </div>
    </aside>
  );
}