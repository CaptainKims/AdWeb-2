import React, { useRef, useCallback, useEffect } from 'react';
import { OrderItem, BudgetItem, SelectedItem, CanvasTransform, StickyNoteData } from './types';
import { OrderCard } from './OrderCard';
import { StickyNoteItem } from './StickyNoteItem';

interface OrderCanvasProps {
  orders: OrderItem[];
  allOrders: OrderItem[];
  campaignBudget?: BudgetItem;
  selected: SelectedItem | null;
  transform: CanvasTransform;
  onTransformChange: (t: CanvasTransform) => void;
  onSelect: (item: SelectedItem | null) => void;
  onDropOnCanvas: (type: string, position: { x: number; y: number }) => void;
  onDropOnOrder: (orderId: string, type: string) => void;
  onMoveOrder: (id: string, position: { x: number; y: number }) => void;
  onToggleOrderCollapse: (id: string) => void;
  onDeleteOrder: (id: string) => void;
  onSaveAsTemplate: (id: string) => void;
  onToggleFlightCollapse: (orderId: string, flightId: string) => void;
  onDeleteFlight: (orderId: string, flightId: string) => void;
  onDeleteCreative: (orderId: string, flightId: string, creativeId: string) => void;
  onAddCreativeRequest: (orderId: string, flightId: string) => void;
  // Sticky notes
  stickyNotes: StickyNoteData[];
  onUpdateStickyNote: (id: string, updates: Partial<StickyNoteData>) => void;
  onDeleteStickyNote: (id: string) => void;
  onBringStickyNoteToFront: (id: string) => void;
}

export function OrderCanvas({
  orders, allOrders, campaignBudget, selected, transform, onTransformChange,
  onSelect, onDropOnCanvas, onDropOnOrder, onMoveOrder,
  onToggleOrderCollapse, onDeleteOrder, onSaveAsTemplate,
  onToggleFlightCollapse, onDeleteFlight, onDeleteCreative, onAddCreativeRequest,
  stickyNotes, onUpdateStickyNote, onDeleteStickyNote, onBringStickyNoteToFront,
}: OrderCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);
  const onTransformChangeRef = useRef(onTransformChange);
  useEffect(() => { onTransformChangeRef.current = onTransformChange; }, [onTransformChange]);
  const onMoveOrderRef = useRef(onMoveOrder);
  useEffect(() => { onMoveOrderRef.current = onMoveOrder; }, [onMoveOrder]);
  const ordersRef = useRef(orders);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  const isPanning        = useRef(false);
  const panStart         = useRef({ x: 0, y: 0 });
  const transformStart   = useRef({ x: 0, y: 0 });
  const isDraggingCard   = useRef(false);
  const draggingOrderId  = useRef<string | null>(null);
  const cardDragStart    = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 });
  const dragMoved        = useRef(false);
  const dragJustEnded    = useRef(false);

  const handleCardDragStart = useCallback((orderId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const order = ordersRef.current.find((o) => o.id === orderId);
    if (!order) return;
    isDraggingCard.current  = true;
    dragMoved.current       = false;
    dragJustEnded.current   = false;
    draggingOrderId.current = orderId;
    cardDragStart.current   = { mouseX: e.clientX, mouseY: e.clientY, cardX: order.position.x, cardY: order.position.y };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const t = transformRef.current;
      if (isPanning.current) {
        onTransformChangeRef.current({ ...t, x: transformStart.current.x + (e.clientX - panStart.current.x), y: transformStart.current.y + (e.clientY - panStart.current.y) });
      }
      if (isDraggingCard.current && draggingOrderId.current) {
        const rawDx = e.clientX - cardDragStart.current.mouseX;
        const rawDy = e.clientY - cardDragStart.current.mouseY;
        if (!dragMoved.current && (Math.abs(rawDx) > 4 || Math.abs(rawDy) > 4)) dragMoved.current = true;
        onMoveOrderRef.current(draggingOrderId.current, {
          x: cardDragStart.current.cardX + rawDx / t.scale,
          y: cardDragStart.current.cardY + rawDy / t.scale,
        });
      }
    };
    const handleMouseUp = () => {
      if (isDraggingCard.current && dragMoved.current) dragJustEnded.current = true;
      dragMoved.current   = false;
      isPanning.current   = false;
      isDraggingCard.current  = false;
      draggingOrderId.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvasBg) {
      isPanning.current = true;
      panStart.current  = { x: e.clientX, y: e.clientY };
      transformStart.current = { x: transform.x, y: transform.y };
      onSelect(null);
    }
  };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const t = transformRef.current;
      const factor   = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(2, Math.max(0.2, t.scale * factor));
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      onTransformChangeRef.current({ x: mx - ((mx - t.x) * newScale) / t.scale, y: my - ((my - t.y) * newScale) / t.scale, scale: newScale });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('containerType');
    if (type === 'order') {
      const rect = canvasRef.current!.getBoundingClientRect();
      const t = transformRef.current;
      onDropOnCanvas(type, { x: (e.clientX - rect.left - t.x) / t.scale, y: (e.clientY - rect.top - t.y) / t.scale });
    }
  };

  const dotSize = 1.5, dotSpacing = 28, dotColor = 'var(--border)';

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleCanvasMouseDown}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: 'var(--background)', cursor: 'grab', backgroundImage: `radial-gradient(circle, ${dotColor} ${dotSize}px, transparent ${dotSize}px)`, backgroundSize: `${dotSpacing}px ${dotSpacing}px`, backgroundPosition: `${transform.x % dotSpacing}px ${transform.y % dotSpacing}px` }}
    >
      <div data-canvas-bg="true" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }}>
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            allOrders={allOrders}
            campaignBudget={campaignBudget}
            selected={selected}
            onSelect={onSelect}
            onDragStart={handleCardDragStart}
            dragJustEnded={dragJustEnded}
            onToggleOrderCollapse={onToggleOrderCollapse}
            onDeleteOrder={onDeleteOrder}
            onSaveAsTemplate={onSaveAsTemplate}
            onDropOnOrder={onDropOnOrder}
            onToggleFlightCollapse={onToggleFlightCollapse}
            onDeleteFlight={onDeleteFlight}
            onDeleteCreative={onDeleteCreative}
            onAddCreativeRequest={onAddCreativeRequest}
          />
        ))}

        {/* ── Sticky notes — rendered above order cards ─────────────────── */}
        {stickyNotes.map((note) => (
          <StickyNoteItem
            key={note.id}
            note={note}
            transform={transform}
            onUpdate={onUpdateStickyNote}
            onDelete={onDeleteStickyNote}
            onBringToFront={onBringStickyNoteToFront}
          />
        ))}
      </div>

      {/* Empty state */}
      {orders.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ padding: '24px 32px', backgroundColor: 'var(--card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', marginBottom: 6 }}>
              Canvas is empty
            </div>
            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 13, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>
              Drag an <strong>Order</strong> from the library on the left
            </div>
          </div>
        </div>
      )}

      {/* Zoom indicator */}
      <div style={{ position: 'absolute', bottom: 14, right: 14, padding: '4px 10px', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-button)', fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', pointerEvents: 'none', boxShadow: 'var(--elevation-sm)' }}>
        {Math.round(transform.scale * 100)}%
      </div>
      <button onMouseDown={(e) => e.stopPropagation()} onClick={() => onTransformChange({ x: 0, y: 0, scale: 1 })}
        style={{ position: 'absolute', bottom: 14, right: 72, padding: '4px 10px', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-button)', fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', cursor: 'pointer', boxShadow: 'var(--elevation-sm)' }}>
        Reset view
      </button>
    </div>
  );
}