import React, { useEffect } from 'react';
import { AlertTriangle, Film } from 'lucide-react';

type ConfirmVariant = 'destructive' | 'primary' | 'warning';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_META: Record<
  ConfirmVariant,
  { iconColor: string; iconBg: string; btnBg: string; btnColor: string; btnHover: string; Icon: React.ComponentType<{ size?: number }> }
> = {
  destructive: {
    iconColor: 'var(--destructive)',
    iconBg: 'rgba(220, 85, 85, 0.10)',
    btnBg: 'var(--destructive)',
    btnColor: 'var(--destructive-foreground)',
    btnHover: 'rgba(220, 85, 85, 0.88)',
    Icon: AlertTriangle,
  },
  warning: {
    iconColor: 'var(--status-warning)',
    iconBg: 'rgba(224, 156, 40, 0.12)',
    btnBg: 'var(--status-warning)',
    btnColor: '#fff',
    btnHover: 'rgba(224, 156, 40, 0.88)',
    Icon: Film,
  },
  primary: {
    iconColor: 'var(--primary)',
    iconBg: 'rgba(130, 124, 200, 0.12)',
    btnBg: 'var(--primary)',
    btnColor: 'var(--primary-foreground)',
    btnHover: 'var(--accent)',
    Icon: Film,
  },
};

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const meta = VARIANT_META[variant];
  const Icon = meta.Icon;

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(42, 42, 56, 0.40)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 48px rgba(42, 42, 56, 0.18), 0 8px 16px rgba(42, 42, 56, 0.10)',
          padding: '28px 28px 24px',
          width: 400,
          maxWidth: '90vw',
          animation: 'modalIn 0.16s ease-out',
        }}
      >
        {/* Icon + Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              backgroundColor: meta.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={18} style={{ color: meta.iconColor } as React.CSSProperties} />
          </div>

          <div>
            <div
              style={{
                fontFamily: 'var(--font-family-display)',
                fontSize: 17,
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--foreground)',
                marginBottom: 4,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-family-text)',
                fontSize: 13,
                fontWeight: 'var(--font-weight-light)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.6,
              }}
            >
              {message}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '20px 0 20px' }} />

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 18px',
              backgroundColor: 'var(--secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-button)',
              fontFamily: 'var(--font-family-text)',
              fontSize: 13,
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--secondary-foreground)',
              cursor: 'pointer',
              transition: 'background-color 0.12s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--secondary)')}
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            style={{
              padding: '9px 18px',
              backgroundColor: meta.btnBg,
              border: 'none',
              borderRadius: 'var(--radius-button)',
              fontFamily: 'var(--font-family-text)',
              fontSize: 13,
              fontWeight: 'var(--font-weight-semibold)',
              color: meta.btnColor,
              cursor: 'pointer',
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
