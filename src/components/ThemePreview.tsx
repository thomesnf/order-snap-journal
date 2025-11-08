import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Heart, Star } from 'lucide-react';

interface ThemePreviewProps {
  palette: {
    primary: string;
    primaryGlow?: string;
    primaryForeground?: string;
    accent: string;
    accentForeground: string;
  };
  mode: 'light' | 'dark';
}

export const ThemePreview = ({ palette, mode }: ThemePreviewProps) => {
  const previewStyle = {
    '--preview-primary': palette.primary,
    '--preview-primary-glow': palette.primaryGlow || palette.primary,
    '--preview-primary-foreground': palette.primaryForeground || (mode === 'light' ? '0 0% 100%' : '222.2 47.4% 11.2%'),
    '--preview-accent': palette.accent,
    '--preview-accent-foreground': palette.accentForeground,
  } as React.CSSProperties;

  return (
    <Card className="overflow-hidden border-2" style={previewStyle}>
      <CardContent className="p-6 space-y-4">
        <div className="text-sm font-semibold text-muted-foreground mb-3">
          Preview
        </div>
        
        {/* Primary Button */}
        <div className="space-y-2">
          <Button 
            className="w-full"
            style={{
              backgroundColor: `hsl(var(--preview-primary))`,
              color: `hsl(var(--preview-primary-foreground))`,
            }}
          >
            <Check className="h-4 w-4 mr-2" />
            Primary Button
          </Button>
        </div>

        {/* Accent Elements */}
        <div className="flex gap-2 flex-wrap">
          <Badge 
            style={{
              backgroundColor: `hsl(var(--preview-accent))`,
              color: `hsl(var(--preview-accent-foreground))`,
            }}
          >
            <Star className="h-3 w-3 mr-1" />
            Accent Badge
          </Badge>
          
          <Badge 
            variant="outline"
            style={{
              borderColor: `hsl(var(--preview-primary))`,
              color: `hsl(var(--preview-primary))`,
            }}
          >
            Outlined
          </Badge>
        </div>

        {/* Card Preview */}
        <div 
          className="p-4 rounded-lg border"
          style={{
            borderColor: `hsl(var(--preview-primary) / 0.2)`,
            background: `linear-gradient(135deg, hsl(var(--preview-primary) / 0.05) 0%, hsl(var(--preview-primary-glow) / 0.1) 100%)`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="h-8 w-8 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: `hsl(var(--preview-accent))`,
                color: `hsl(var(--preview-accent-foreground))`,
              }}
            >
              <Heart className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Sample Card</div>
              <div className="text-xs text-muted-foreground">With accent icon</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            This is how your content will look with this theme.
          </p>
        </div>

        {/* Secondary Button */}
        <Button 
          variant="outline"
          className="w-full"
          style={{
            borderColor: `hsl(var(--preview-primary))`,
            color: `hsl(var(--preview-primary))`,
          }}
        >
          Outline Button
        </Button>

        {/* Text with Primary Color */}
        <div className="text-center">
          <p 
            className="text-sm font-semibold"
            style={{ color: `hsl(var(--preview-primary))` }}
          >
            Primary colored text
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Regular muted text
          </p>
        </div>
      </CardContent>
    </Card>
  );
};