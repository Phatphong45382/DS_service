'use client';

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customerData, formatCurrency } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Search, Filter, MoreHorizontal } from "lucide-react";

export function CustomerTable() {
    return (
        <Card className="bg-white rounded-[var(--radius-card)] border border-warm-border shadow-enterprise-sm overflow-hidden">
            <div className="p-6 border-b border-warm-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-warm-text-primary font-poppins">Customer List 👥</h3>
                    <p className="text-sm text-warm-text-secondary mt-1">Manage your customer database</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-text-muted" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="pl-9 pr-4 py-2 rounded-xl border border-warm-border text-sm focus:outline-none focus:ring-2 focus:ring-warm-accent/20 w-64"
                        />
                    </div>
                </div>
            </div>

            <Table>
                <TableHeader className="bg-warm-bg-table-header">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-warm-text-secondary w-[250px]">Customer Name</TableHead>
                        <TableHead className="font-bold text-warm-text-secondary">Email</TableHead>
                        <TableHead className="font-bold text-warm-text-secondary">Type</TableHead>
                        <TableHead className="font-bold text-warm-text-secondary">Total Spent</TableHead>
                        <TableHead className="font-bold text-warm-text-secondary">Last Order</TableHead>
                        <TableHead className="font-bold text-warm-text-secondary text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {customerData.map((item) => (
                        <TableRow key={item.id} className="hover:bg-warm-bg-subtle/50 border-b border-warm-border">
                            <TableCell className="font-medium text-warm-text-primary py-4">
                                {item.name}
                            </TableCell>
                            <TableCell className="text-warm-text-secondary">{item.email}</TableCell>
                            <TableCell>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5",
                                    item.type === 'VIP' && "bg-[#FFF7ED] text-[#F97316]",
                                    item.type === 'Returning' && "bg-[#F0F9FF] text-[#0EA5E9]",
                                    item.type === 'New' && "bg-[#ECFDF5] text-[#10B981]"
                                )}>
                                    {item.type}
                                </span>
                            </TableCell>
                            <TableCell className="font-medium text-warm-text-primary">{formatCurrency(item.totalSpent)}</TableCell>
                            <TableCell className="text-warm-text-secondary">{item.lastOrder}</TableCell>
                            <TableCell className="text-right">
                                <button className="p-2 hover:bg-warm-bg-subtle rounded-full transition-colors">
                                    <MoreHorizontal className="w-4 h-4 text-warm-text-muted" />
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
