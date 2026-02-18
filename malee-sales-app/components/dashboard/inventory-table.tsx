'use client';

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inventoryData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Search, Plus, Filter } from "lucide-react";

export function InventoryTable() {
    return (
        <Card className="bg-white rounded-[24px] border border-[#EBE5E0] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#EBE5E0] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-[#44403C] font-poppins">Stock Overview 📦</h3>
                    <p className="text-sm text-[#78716C] mt-1">Manage your product inventory</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="pl-9 pr-4 py-2 rounded-xl border border-[#EBE5E0] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A5B]/20 w-64"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EBE5E0] rounded-xl text-sm font-semibold text-[#44403C] hover:bg-[#F5EFE9] transition-colors">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#FF8A5B] text-white rounded-xl text-sm font-bold hover:bg-[#FF7A4B] transition-colors shadow-lg shadow-[#FF8A5B]/20">
                        <Plus className="w-4 h-4" />
                        Add Product
                    </button>
                </div>
            </div>

            <Table>
                <TableHeader className="bg-[#FFF5F0]">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-[#78716C]">Product Name</TableHead>
                        <TableHead className="font-bold text-[#78716C]">Category</TableHead>
                        <TableHead className="font-bold text-[#78716C]">Price</TableHead>
                        <TableHead className="font-bold text-[#78716C] text-center">Stock Level</TableHead>
                        <TableHead className="font-bold text-[#78716C]">Status</TableHead>
                        <TableHead className="font-bold text-[#78716C] text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {inventoryData.map((item) => (
                        <TableRow key={item.id} className="hover:bg-[#F5EFE9]/50 border-b border-[#EBE5E0]">
                            <TableCell className="font-medium text-[#44403C] py-4">{item.name}</TableCell>
                            <TableCell className="text-[#78716C]">{item.category}</TableCell>
                            <TableCell className="font-medium text-[#44403C]">฿{item.price}</TableCell>
                            <TableCell className="text-center font-bold text-[#44403C]">{item.stock}</TableCell>
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
                                <button className="text-[#FF8A5B] font-medium text-sm hover:underline">Edit</button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
