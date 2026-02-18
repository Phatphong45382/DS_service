'use client';

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inventoryData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Search, Plus, Filter } from "lucide-react";

export function InventoryTable() {
    return (
        <Card className="bg-white rounded-[var(--radius-card)] border border-warm-border shadow-enterprise-sm overflow-hidden">
            <div className="p-6 border-b border-warm-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-warm-text-primary font-poppins">Stock Overview 📦</h3>
                    <p className="text-sm text-warm-text-secondary mt-1">Manage your product inventory</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-text-muted" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="pl-9 pr-4 py-2 rounded-xl border border-warm-border text-sm focus:outline-none focus:ring-2 focus:ring-warm-accent/20 w-64"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-border rounded-xl text-sm font-semibold text-warm-text-primary hover:bg-warm-bg-subtle transition-colors">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-warm-accent text-white rounded-xl text-sm font-bold hover:bg-warm-accent-hover transition-colors shadow-lg shadow-warm-accent/20">
                        <Plus className="w-4 h-4" />
                        Add Product
                    </button>
                </div>
            </div>

            <Table>
                <TableHeader className="bg-warm-bg-table-header">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-warm-text-secondary">Product Name</TableHead>
                        <TableHead className="font-bold text-warm-text-secondary">Category</TableHead>
                        <TableHead className="font-bold text-warm-text-secondary">Price</TableHead>
                        <TableHead className="font-bold text-warm-text-secondary text-center">Stock Level</TableHead>
                        <TableHead className="font-bold text-warm-text-secondary">Status</TableHead>
                        <TableHead className="font-bold text-warm-text-secondary text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {inventoryData.map((item) => (
                        <TableRow key={item.id} className="hover:bg-warm-bg-subtle/50 border-b border-warm-border">
                            <TableCell className="font-medium text-warm-text-primary py-4">{item.name}</TableCell>
                            <TableCell className="text-warm-text-secondary">{item.category}</TableCell>
                            <TableCell className="font-medium text-warm-text-primary">฿{item.price}</TableCell>
                            <TableCell className="text-center font-bold text-warm-text-primary">{item.stock}</TableCell>
                            <TableCell>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5",
                                    item.status === 'In Stock' && "bg-[#ECFDF5] text-[#10B981]",
                                    item.status === 'Low Stock' && "bg-[#FFFBEB] text-[#F59E0B]",
                                    item.status === 'Out of Stock' && "bg-[#FEF2F2] text-[#EF4444]"
                                )}>
                                    <span className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        item.status === 'In Stock' && "bg-[#10B981]",
                                        item.status === 'Low Stock' && "bg-[#F59E0B]",
                                        item.status === 'Out of Stock' && "bg-[#EF4444]"
                                    )} />
                                    {item.status}
                                </span>
                            </TableCell>
                            <TableCell className="text-right">
                                <button className="text-warm-accent font-medium text-sm hover:underline">Edit</button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
