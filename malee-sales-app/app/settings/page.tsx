'use client';

import { MainLayout } from "@/components/layout/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Bell, Moon, Shield, LogOut } from "lucide-react";

export default function SettingsPage() {
    return (
        <MainLayout title="Settings">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#44403C] font-poppins">Settings</h1>
                    <p className="text-[#78716C] mt-2">Manage your account and preferences</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar Navigation */}
                    <Card className="p-4 bg-white rounded-[24px] border border-[#EBE5E0] h-fit">
                        <nav className="space-y-1">
                            {[
                                { name: 'Profile', icon: User, active: true },
                                { name: 'Notifications', icon: Bell, active: false },
                                { name: 'Appearance', icon: Moon, active: false },
                                { name: 'Security', icon: Shield, active: false },
                            ].map((item) => (
                                <button
                                    key={item.name}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${item.active
                                        ? 'bg-[#FFF5F0] text-[#FF8A5B]'
                                        : 'text-[#78716C] hover:bg-[#F5EFE9] hover:text-[#44403C]'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                </button>
                            ))}
                        </nav>
                        <div className="mt-4 pt-4 border-t border-[#EBE5E0]">
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#FF5B5B] hover:bg-[#FEF2F2] transition-colors">
                                <LogOut className="w-5 h-5" />
                                Log out
                            </button>
                        </div>
                    </Card>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Section */}
                        <Card className="p-8 bg-white rounded-[24px] border border-[#EBE5E0]">
                            <h2 className="text-xl font-bold text-[#44403C] font-poppins mb-6">Profile Information</h2>

                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-24 h-24 rounded-full bg-[#FFF5F0] border-4 border-white shadow-lg flex items-center justify-center text-[#FF8A5B]">
                                    <User className="w-10 h-10" />
                                </div>
                                <div>
                                    <Button variant="outline" className="rounded-xl border-[#EBE5E0] text-[#44403C] hover:bg-[#F5EFE9] hover:text-[#FF8A5B]">
                                        Change Avatar
                                    </Button>
                                    <p className="text-xs text-[#A8A29E] mt-2">JPG, GIF or PNG. 1MB max.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-[#44403C]">First Name</label>
                                    <input
                                        type="text"
                                        defaultValue="Admin"
                                        className="w-full p-3 rounded-xl bg-[#F9FAFB] border border-[#EBE5E0] text-[#44403C] focus:outline-none focus:ring-2 focus:ring-[#FF8A5B]/20 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-[#44403C]">Last Name</label>
                                    <input
                                        type="text"
                                        defaultValue="User"
                                        className="w-full p-3 rounded-xl bg-[#F9FAFB] border border-[#EBE5E0] text-[#44403C] focus:outline-none focus:ring-2 focus:ring-[#FF8A5B]/20 transition-all"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-[#44403C]">Email Address</label>
                                    <input
                                        type="email"
                                        defaultValue="admin@malee.com"
                                        className="w-full p-3 rounded-xl bg-[#F9FAFB] border border-[#EBE5E0] text-[#44403C] focus:outline-none focus:ring-2 focus:ring-[#FF8A5B]/20 transition-all"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-[#44403C]">Bio</label>
                                    <textarea
                                        rows={4}
                                        defaultValue="Administrator of Malee Sales Dashboard."
                                        className="w-full p-3 rounded-xl bg-[#F9FAFB] border border-[#EBE5E0] text-[#44403C] focus:outline-none focus:ring-2 focus:ring-[#FF8A5B]/20 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <Button variant="ghost" className="rounded-xl text-[#78716C] hover:text-[#44403C] hover:bg-[#F5EFE9]">Cancel</Button>
                                <Button className="rounded-xl bg-[#FF8A5B] hover:bg-[#FF7A4B] text-white shadow-lg shadow-[#FF8A5B]/20">Save Changes</Button>
                            </div>
                        </Card>

                        {/* Application Settings (Mock) */}
                        <Card className="p-8 bg-white rounded-[24px] border border-[#EBE5E0]">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-[#44403C] font-poppins">Preferences</h2>
                                    <p className="text-sm text-[#78716C]">Manage your notification settings</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {['Email Notifications', 'Push Notifications', 'Weekly Reports'].map((item) => (
                                    <div key={item} className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-xl border border-[#EBE5E0]">
                                        <span className="font-medium text-[#44403C]">{item}</span>
                                        <div className="w-11 h-6 bg-[#FF8A5B] rounded-full relative cursor-pointer">
                                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
