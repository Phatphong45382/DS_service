'use client';

import { Card } from "@/components/ui/card";
import { Product } from "@/types";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopProductsProps {
    products: Product[];
}

export function TopProducts({ products }: TopProductsProps) {
    const maxRevenue = Math.max(...products.map(p => p.revenue));

    return (
        <Card className="bg-warm-bg-card rounded-[var(--radius-card)] p-8 border border-warm-border shadow-warm-sm">
            <div className="space-y-1 mb-8">
                <h3 className="text-xl font-bold text-warm-text-primary font-poppins">Top Products 🏆</h3>
                <p className="text-sm text-warm-text-secondary font-medium mt-1">Your best selling items</p>
            </div>

            <div className="space-y-6">
                {products.map((product, index) => {
                    const widthPercentage = (product.revenue / maxRevenue) * 100;

                    return (
                        <div key={product.id} className="group">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <span className={cn(
                                        "flex items-center justify-center w-8 h-8 text-sm font-bold rounded-xl shadow-sm transition-transform group-hover:scale-110",
                                        index === 0 ? "bg-warm-accent text-white" :
                                            index === 1 ? "bg-warm-accent-2 text-white" :
                                                index === 2 ? "bg-warm-accent-3 text-white" : "bg-[#F5F5F5] text-warm-text-muted border border-warm-border"
                                    )}>
                                        {index + 1}
                                    </span>
                                    <span className="text-sm font-bold truncate text-warm-text-primary font-poppins">
                                        {product.name}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-warm-text-primary font-poppins">
                                        {new Intl.NumberFormat('th-TH', {
                                            style: 'currency',
                                            currency: 'THB',
                                            minimumFractionDigits: 0,
                                        }).format(product.revenue)}
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar Container */}
                            <div className="h-3 bg-warm-bg-subtle rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${widthPercentage}%`,
                                        backgroundColor: index === 0 ? 'var(--warm-accent)' :
                                            index === 1 ? 'var(--warm-accent-2)' :
                                                index === 2 ? 'var(--warm-accent-3)' : '#E5E5E5'
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
