import { useLocation } from "react-router";
import { Package } from "lucide-react";

export function PlaceholderScreen() {
  const location = useLocation();
  const pageName = location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2);

  return (
    <div className="min-h-full bg-background flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-20 h-20 rounded-[var(--radius-lg)] bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Package size={40} className="text-primary" />
        </div>
        <h1
          className="text-foreground mb-2"
          style={{
            fontSize: "28px",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-family-display)",
          }}
        >
          {pageName}
        </h1>
        <p 
          className="text-muted-foreground"
          style={{ 
            fontSize: "14px",
            fontFamily: "var(--font-family-text)",
            fontWeight: "var(--font-weight-light)",
          }}
        >
          This section is coming soon
        </p>
      </div>
    </div>
  );
}
