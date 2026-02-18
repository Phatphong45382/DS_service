'use client';

import { usePlanning } from '@/lib/planning-context';
import { Calendar, CheckCircle2, Activity, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardHero() {
    return (
        <div className="relative overflow-hidden bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 lg:p-12 mb-8">
            {/* Background Decorative Blobs */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-teal-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* Left Content */}
                <div className="space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100/80 backdrop-blur-sm rounded-full border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span className="text-xs font-bold text-slate-600 font-heading tracking-wide">Trusted by Production Team</span>
                    </div>

                    <div>
                        <h1 className="text-6xl font-black text-slate-900 leading-[1.1] tracking-tight font-heading">
                            Smart Planning <br />
                            <span className="text-teal-600">for Your Future</span>
                        </h1>
                        <p className="mt-6 text-xl text-slate-500 leading-relaxed max-w-md font-medium">
                            AI-driven sales forecasting and production optimization with a gentle touch.
                            Manage your targets efficiently.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <Button className="h-14 px-8 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg shadow-teal-600/20 text-lg font-bold transition-all hover:scale-105 font-heading">
                            <Calendar className="w-5 h-5 mr-2" />
                            Book Planning
                        </Button>
                        <Button variant="outline" className="h-14 px-8 rounded-full border-2 border-slate-200 text-slate-700 text-lg font-bold hover:bg-slate-50 hover:border-slate-300 font-heading">
                            Our Services
                        </Button>
                    </div>
                </div>

                {/* Right Visual (Composition) - No Cards */}
                <div className="relative">
                    {/* Main Visual Frame - Rotated & Rounded */}
                    <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200 border-[6px] border-white rotate-1 hover:rotate-0 transition-all duration-700 ease-out">
                        <div className="h-[450px] bg-gradient-to-br from-slate-900 to-slate-800 p-8 flex flex-col justify-between relative overflow-hidden group">
                            {/* Abstract Chart Background */}
                            <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                            <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-gradient-to-b from-transparent via-teal-500/10 to-transparent rotate-45 animate-pulse"></div>

                            {/* Content Overlay */}
                            <div className="relative z-10 flex justify-between items-start">
                                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                                    <Activity className="w-8 h-8 text-teal-300" />
                                </div>
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-3xl font-bold text-white mb-4 font-heading tracking-tight">AI Forecasting</h3>
                                <div className="h-40 flex items-end gap-3">
                                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 bg-gradient-to-t from-teal-400 to-blue-500 rounded-t-xl opacity-90 group-hover:opacity-100 transition-all duration-500"
                                            style={{ height: `${h}%`, transitionDelay: `${i * 50}ms` }}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
