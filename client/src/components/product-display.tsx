import { CheckCircle, Crown, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ClaimWithItems } from "@shared/schema";

interface ProductDisplayProps {
  claimData: ClaimWithItems;
  onProceed: () => void;
}

export function ProductDisplay({ claimData, onProceed }: ProductDisplayProps) {
  const getRarityIcon = (category: string) => {
    if (category.includes("Legendary")) {
      return <Crown className="w-3 h-3 mr-1" />;
    }
    return <Star className="w-3 h-3 mr-1" />;
  };

  const getRarityColor = (category: string) => {
    if (category.includes("Legendary")) {
      return "bg-primary/20 text-primary border-primary/30";
    }
    return "bg-secondary/20 text-secondary border-secondary/30";
  };

  return (
    <Card className="shadow-2xl border-border fade-in" data-testid="card-product-display">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-2xl text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-card-foreground mb-3" data-testid="text-verification-success">
            Verification Successful!
          </h2>
          <p className="text-muted-foreground text-lg" data-testid="text-items-description">
            Here are the items from your purchase
          </p>
        </div>

        <div className="space-y-6" data-testid="container-purchased-items">
          {claimData.items.map((item) => (
            <div 
              key={item.id}
              className="glass-effect rounded-lg p-6 border border-border/50"
              data-testid={`card-item-${item.id}`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-4 flex-1">
                  <img
                    src={item.imageUrl || "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120"}
                    alt={item.itemName}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border-2 border-primary/30 flex-shrink-0"
                    data-testid={`img-item-${item.id}`}
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-card-foreground truncate" data-testid={`text-item-name-${item.id}`}>
                      {item.itemName}
                    </h3>
                    <p className="text-muted-foreground mb-2 text-sm sm:text-base" data-testid={`text-item-category-${item.id}`}>
                      {item.itemCategory}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <Badge 
                        className={`${getRarityColor(item.itemCategory)} text-xs font-medium`}
                        data-testid={`badge-rarity-${item.id}`}
                      >
                        {getRarityIcon(item.itemCategory)}
                        {item.itemCategory.split(" • ")[0]}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground" data-testid={`text-quantity-${item.id}`}>
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto">
                  <p className="text-xl sm:text-2xl font-bold text-primary" data-testid={`text-price-${item.id}`}>
                    ${item.price}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Paid</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 text-center">
          <Button
            onClick={onProceed}
            className="inline-flex items-center bg-primary hover:bg-secondary text-primary-foreground font-semibold py-4 px-8 glow-effect hover:scale-[1.02] transition-all duration-200"
            data-testid="button-proceed"
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            Proceed to Claim Items
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
