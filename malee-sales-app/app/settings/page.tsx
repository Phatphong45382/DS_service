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
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
                    <p className="text-slate-500 mt-2">Manage your account and preferences</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar Navigation */}
                    <Card className="p-4 bg-white rounded-2xl border border-slate-200 h-fit shadow-sm">
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
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                </button>
                            ))}
                        </nav>
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                                <LogOut className="w-5 h-5" />
                                Log out
                            </button>
                        </div>
                    </Card>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Section */}
                        <Card className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Profile Information</h2>

                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow-lg flex items-center justify-center text-blue-600">
                                    <User className="w-10 h-10" />
                                </div>
                                <div>
                                    <Button variant="outline" className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                                        Change Avatar
                                    </Button>
                                    <p className="text-xs text-slate-400 mt-2">JPG, GIF or PNG. 1MB max.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-900">First Name</label>
                                    <input
                                        type="text"
                                        defaultValue="Admin"
                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-900">Last Name</label>
                                    <input
                                        type="text"
                                        defaultValue="User"
                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-900">Email Address</label>
                                    <input
                                        type="email"
                                        defaultValue="admin@company.com"
                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-900">Bio</label>
                                    <textarea
                                        rows={4}
                                        defaultValue="Administrator of Sales Forecast Dashboard."
                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <Button variant="ghost" className="rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100">Cancel</Button>
                                <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">Save Changes</Button>
                            </div>
                        </Card>

                        {/* Application Settings (Mock) */}
                        <Card className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Preferences</h2>
                                    <p className="text-sm text-slate-500">Manage your notification settings</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {['Email Notifications', 'Push Notifications', 'Weekly Reports'].map((item) => (
                                    <div key={item} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <span className="font-medium text-slate-900">{item}</span>
                                        <div className="w-11 h-6 bg-blue-600 rounded-full relative cursor-pointer">
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
