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
        <Card className="bg-[#FCFBF9] rounded-[24px] p-8 border border-[#EBE5E0] shadow-[0_4px_16px_rgba(97,78,66,0.03)]">
            <div className="space-y-1 mb-8">
                <h3 className="text-xl font-bold text-[#44403C] font-poppins">Top Products 🏆</h3>
                <p className="text-sm text-[#78716C] font-medium mt-1">Your best selling items</p>
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
                                        index === 0 ? "bg-[#FF8A5B] text-white" :
                                            index === 1 ? "bg-[#FFB74D] text-white" :
                                                index === 2 ? "bg-[#FFCC80] text-white" : "bg-[#F5F5F5] text-[#A8A29E] border border-[#EBE5E0]"
                                    )}>
                                        {index + 1}
                                    </span>
                                    <span className="text-sm font-bold truncate text-[#44403C] font-poppins">
                                        {product.name}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-[#44403C] font-poppins">
                                        {new Intl.NumberFormat('th-TH', {
                                            style: 'currency',
                                            currency: 'THB',
                                            minimumFractionDigits: 0,
                                        }).format(product.revenue)}
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar Container */}
                            <div className="h-3 bg-[#F5EFE9] rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${widthPercentage}%`,
                                        backgroundColor: index === 0 ? '#FF8A5B' :
                                            index === 1 ? '#FFB74D' :
                                                index === 2 ? '#FFCC80' : '#E5E5E5'
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
