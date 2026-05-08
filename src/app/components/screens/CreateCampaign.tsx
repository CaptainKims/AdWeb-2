import { Link } from "react-router";
import { LayoutTemplate, Copy, Zap, Sliders } from "lucide-react";

export function CreateCampaign() {
  const options = [
    {
      id: "template",
      icon: LayoutTemplate,
      title: "Use Template",
      description: "Start with a pre-configured campaign template optimized for common goals",
      complexity: "Simple",
      recommendedFor: "SMBs, First-time users",
      link: "/templates",
    },
    {
      id: "copy",
      icon: Copy,
      title: "Copy Existing Campaign",
      description: "Duplicate a previous campaign and modify it for your new goals",
      complexity: "Simple",
      recommendedFor: "Repeat campaigns, Similar strategies",
      link: "/",
    },
    {
      id: "quick",
      icon: Zap,
      title: "Quick Campaign",
      description: "Create a single-channel campaign quickly with guided setup",
      complexity: "Medium",
      recommendedFor: "Single promotions, Time-sensitive",
      link: "/campaign/new-quick",
    },
    {
      id: "advanced",
      icon: Sliders,
      title: "Advanced Builder",
      description: "Full control with multi-channel planning, custom targeting, and detailed optimization",
      complexity: "Advanced",
      recommendedFor: "Media agencies, Complex campaigns",
      link: "/campaign/new-advanced",
    },
  ];

  const complexityColors = {
    Simple: "text-[#22c55e]",
    Medium: "text-[#f59e0b]",
    Advanced: "text-accent",
  };

  return (
    <div className="min-h-full bg-background p-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-foreground mb-2"
            style={{ 
              fontSize: '32px',
              fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-display)'
            }}
          >
            Create New Campaign
          </h1>
          <p 
            className="text-muted-foreground"
            style={{ fontSize: '14px', fontFamily: 'var(--font-family-text)', fontWeight: 'var(--font-weight-light)' }}
          >
            Choose how you want to start building your video advertising campaign
          </p>
        </div>

        {/* Option Cards */}
        <div className="grid grid-cols-2 gap-6">
          {options.map((option) => {
            const Icon = option.icon;
            
            return (
              <Link
                key={option.id}
                to={option.link}
                className="group bg-card border border-border rounded-[var(--radius-lg)] p-6 hover:border-primary transition-all duration-200 cursor-pointer"
              >
                {/* Icon and Title */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-[var(--radius-md)] bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon size={24} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 
                      className="text-card-foreground mb-1 group-hover:text-primary transition-colors"
                      style={{ 
                        fontSize: '20px',
                        fontWeight: 'var(--font-weight-semibold)',
                        fontFamily: 'var(--font-family-display)'
                      }}
                    >
                      {option.title}
                    </h3>
                    <p 
                      className="text-muted-foreground"
                      style={{ fontSize: '14px', fontFamily: 'var(--font-family-text)', fontWeight: 'var(--font-weight-light)' }}
                    >
                      {option.description}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-6 pt-4 border-t border-border">
                  <div>
                    <div 
                      className="text-muted-foreground mb-1"
                      style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-family-text)', fontWeight: 'var(--font-weight-semibold)' }}
                    >
                      Complexity
                    </div>
                    <div 
                      className={`${complexityColors[option.complexity as keyof typeof complexityColors]}`}
                      style={{ fontSize: '13px', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-text)' }}
                    >
                      {option.complexity}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div 
                      className="text-muted-foreground mb-1"
                      style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-family-text)', fontWeight: 'var(--font-weight-semibold)' }}
                    >
                      Recommended For
                    </div>
                    <div 
                      className="text-card-foreground"
                      style={{ fontSize: '13px', fontFamily: 'var(--font-family-text)', fontWeight: 'var(--font-weight-light)' }}
                    >
                      {option.recommendedFor}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}