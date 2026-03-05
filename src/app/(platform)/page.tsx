"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GrowingForm } from "@/components/jobs/GrowingForm";
import { ScheduleJobModal } from "@/components/schedule/ScheduleJobModal";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from "recharts";
import {
    Clock,
    FileText,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    MapPin,
    Truck,
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const COLORS = [
    '#3b82f6', // Enquiry (Blue)
    '#6366f1', // Quote (Indigo)
    '#8b5cf6', // Quote Sent (Purple)
    '#ec4899', // Quote Accepted (Pink)
    '#f59e0b', // Job Booked (Amber)
    '#ef4444', // Job Scheduled (Red)
    '#10b981', // Allocated (Emerald)
    '#06b6d4', // Site Docket (Cyan)
];

const STATUS_ORDER = [
    'Enquiry', 'Quote', 'Quote Sent', 'Quote Accepted',
    'Job Booked', 'Job Scheduled', 'Allocated', 'Site Docket'
];

interface StatCardProps {
    title: string;
    icon: any;
    children: React.ReactNode;
    color: "blue" | "green" | "yellow" | "purple";
}

function StatCard({ title, icon: Icon, children, color }: StatCardProps) {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        green: "bg-green-50 text-green-600 border-green-100",
        yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full transition-all hover:shadow-md">
            <div className={cn("px-5 py-4 flex items-center justify-between border-b", colorClasses[color])}>
                <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
                <Icon className="h-5 w-5 opacity-80" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {children}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const router = useRouter();
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [unscheduledJobs, setUnscheduledJobs] = useState<any[]>([]);
    const [todayJobs, setTodayJobs] = useState<any[]>([]);
    const [statusStats, setStatusStats] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [schedulingJobId, setSchedulingJobId] = useState<string | null>(null);

    // Sort orders
    const [enquirySort, setEnquirySort] = useState<"asc" | "desc">("desc");
    const [quoteSort, setQuoteSort] = useState<"asc" | "desc">("desc");
    const [unscheduledSort, setUnscheduledSort] = useState<"asc" | "desc">("desc");

    useEffect(() => {
        fetchDashboardData();

        const channel = createClient().channel('dashboard_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, () => {
                fetchDashboardData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
                fetchDashboardData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_schedules' }, () => {
                fetchDashboardData();
            })
            .subscribe();

        return () => {
            createClient().removeChannel(channel);
        };
    }, [enquirySort, quoteSort, unscheduledSort]);

    async function fetchDashboardData() {
        setIsLoading(true);

        const today = moment().startOf('day').toISOString();
        const endOfToday = moment().endOf('day').toISOString();

        // 1. Fetch Latest Unactioned Enquiries
        const { data: enqData } = await createClient()
            .from("enquiries")
            .select("*")
            .eq("status", "New")
            .eq("is_trashed", false)
            .order("created_at", { ascending: enquirySort === "asc" })
            .limit(10);

        if (enqData) setEnquiries(enqData);

        // 2. Fetch Open Quotes (from Jobs)
        const { data: quoteData } = await createClient()
            .from("jobs")
            .select("*, customers(name)")
            .in("status_id", ["Quote", "Quote Sent"])
            .order("created_at", { ascending: quoteSort === "asc" })
            .limit(10);

        if (quoteData) {
            const flattened = quoteData.map(q => ({
                ...q,
                customer: Array.isArray(q.customers) ? q.customers[0] : (q.customers as any)
            }));
            setQuotes(flattened);
        }

        // 3. Fetch Unscheduled Jobs (Job Booked)
        const { data: unschedData } = await createClient()
            .from("jobs")
            .select("*, customers(name)")
            .eq("status_id", "Job Booked")
            .order("created_at", { ascending: unscheduledSort === "asc" })
            .limit(10);

        if (unschedData) {
            const flattened = unschedData.map(j => ({
                ...j,
                customer: Array.isArray(j.customers) ? j.customers[0] : (j.customers as any)
            }));
            setUnscheduledJobs(flattened);
        }

        // 4. Fetch Today's Jobs (from job_schedules)
        const { data: schedData } = await createClient()
            .from("job_schedules")
            .select(`
                id,
                start_time,
                end_time,
                jobs (
                    id,
                    location,
                    status_id,
                    customers ( name )
                )
            `)
            .gte("start_time", today)
            .lte("start_time", endOfToday)
            .order("start_time", { ascending: true });

        if (schedData) {
            // Further enrich with resources per job
            const mappedSched = schedData.map(s => {
                const jInput = Array.isArray(s.jobs) ? s.jobs[0] : (s.jobs as any);
                const customer = Array.isArray(jInput?.customers) ? jInput.customers[0] : jInput?.customers;
                return {
                    ...s,
                    job: { ...jInput, customer }
                };
            });

            const jobIds = mappedSched.map(s => s.job?.id).filter(Boolean);
            if (jobIds.length > 0) {
                const { data: resData } = await createClient()
                    .from("job_resources")
                    .select("job_id, resource_type, assets(name), personnel(name)")
                    .in("job_id", jobIds);

                const enriched = mappedSched.map(s => ({
                    ...s,
                    resources: resData?.filter(r => r.job_id === s.job?.id) || []
                }));
                setTodayJobs(enriched);
            } else {
                setTodayJobs([]);
            }
        }

        // 5. Status Stats for Pie Chart
        const { data: statusData } = await createClient()
            .from("jobs")
            .select("status_id");

        if (statusData) {
            const counts = statusData.reduce((acc: any, curr: any) => {
                const s = curr.status_id;
                if (s !== 'Completed' && s !== 'Invoiced') {
                    acc[s] = (acc[s] || 0) + 1;
                }
                return acc;
            }, {});

            const chartData = STATUS_ORDER.map(label => ({
                name: label,
                value: counts[label] || 0
            })).filter(d => d.value > 0);

            setStatusStats(chartData);
        }

        setIsLoading(false);
    }

    return (
        <div className="space-y-8 pb-10">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dispatcher Dashboard</h1>
                    <p className="text-gray-500 mt-1 font-medium">Real-time overview of ScheduleLab operations.</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{moment().format('dddd, MMMM Do')}</p>
                    <p className="text-xs text-gray-400">System Local Time: {moment().format('h:mm A')}</p>
                </div>
            </header>

            {/* TOP 1/3: STAT CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                {/* 1. Latest Enquiries */}
                <StatCard title="Latest Enquiries" icon={Clock} color="blue">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Showing last 10</span>
                        <button
                            onClick={() => setEnquirySort(s => s === "asc" ? "desc" : "asc")}
                            className="text-[10px] font-black text-blue-600 uppercase hover:underline flex items-center"
                        >
                            Sort: {enquirySort === "asc" ? "Oldest" : "Newest"}
                            {enquirySort === "asc" ? <ArrowUpRight className="h-2 w-2 ml-1" /> : <ArrowDownRight className="h-2 w-2 ml-1" />}
                        </button>
                    </div>
                    {enquiries.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm italic">No enquiries found.</div>
                    ) : (
                        <div className="space-y-3">
                            {enquiries.map(e => (
                                <div
                                    key={e.id}
                                    onClick={() => router.push('/enquiries')}
                                    className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-gray-900 text-sm leading-tight group-hover:text-blue-600">{e.customer_name}</p>
                                        <span className="text-[9px] font-black text-blue-500 uppercase">{moment(e.created_at).fromNow()}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{e.job_details}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </StatCard>

                {/* 2. Open Quotes */}
                <StatCard title="Open Quotes" icon={FileText} color="purple">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Pending Response</span>
                        <button
                            onClick={() => setQuoteSort(s => s === "asc" ? "desc" : "asc")}
                            className="text-[10px] font-black text-purple-600 uppercase hover:underline flex items-center"
                        >
                            Sort: {quoteSort === "asc" ? "Oldest" : "Newest"}
                            {quoteSort === "asc" ? <ArrowUpRight className="h-2 w-2 ml-1" /> : <ArrowDownRight className="h-2 w-2 ml-1" />}
                        </button>
                    </div>
                    {quotes.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm italic">No open quotes.</div>
                    ) : (
                        <div className="space-y-3">
                            {quotes.map(q => (
                                <div
                                    key={q.id}
                                    onClick={() => setActiveJobId(q.id)}
                                    className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-gray-900 text-sm leading-tight group-hover:text-purple-600">{q.customer?.name || "Unknown Customer"}</p>
                                        <span className={cn(
                                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase",
                                            q.status_id === "Quote Sent" ? "bg-purple-100 text-purple-700" : "bg-gray-200 text-gray-700"
                                        )}>
                                            {q.status_id}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">${q.pricing?.toLocaleString() || "0.00"}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </StatCard>

                {/* 3. Unscheduled Jobs */}
                <StatCard title="Unscheduled Jobs" icon={Calendar} color="green">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Awaiting Scheduling</span>
                        <button
                            onClick={() => setUnscheduledSort(s => s === "asc" ? "desc" : "asc")}
                            className="text-[10px] font-black text-green-600 uppercase hover:underline flex items-center"
                        >
                            Sort: {unscheduledSort === "asc" ? "Oldest" : "Newest"}
                            {unscheduledSort === "asc" ? <ArrowUpRight className="h-2 w-2 ml-1" /> : <ArrowDownRight className="h-2 w-2 ml-1" />}
                        </button>
                    </div>
                    {unscheduledJobs.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm italic">No unscheduled booked jobs.</div>
                    ) : (
                        <div className="space-y-3">
                            {unscheduledJobs.map((j: any) => (
                                <div
                                    key={j.id}
                                    onClick={() => setSchedulingJobId(j.id)}
                                    className="p-3 bg-green-50 rounded-xl border border-green-100 hover:border-green-400 hover:shadow-md cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-gray-900 text-sm leading-tight group-hover:text-green-700">{j.customer?.name || "Unknown Customer"}</p>
                                        <span className="text-[9px] font-black text-green-500 uppercase">{moment(j.created_at).fromNow()}</span>
                                    </div>
                                    <div className="flex items-center text-[10px] text-gray-500 mt-1">
                                        <MapPin className="h-3 w-3 mr-1 text-red-400" />
                                        <span className="line-clamp-1">{j.location || "No location specified"}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </StatCard>
            </div>

            {/* FULL WIDTH: Today's Schedule */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="px-5 py-4 flex items-center justify-between border-b bg-gray-50 text-gray-800 border-gray-200">
                    <h3 className="text-sm font-bold uppercase tracking-wider">Today's Schedule</h3>
                    <Clock className="h-5 w-5 opacity-80" />
                </div>
                <div className="p-5">
                    {todayJobs.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm italic">No jobs scheduled for today.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {todayJobs.map(sj => (
                                <div
                                    key={sj.id}
                                    onClick={() => setActiveJobId(sj.job?.id)}
                                    className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all relative overflow-hidden group"
                                >
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                                    <div className="flex justify-between items-start mb-2 pl-3">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900 text-sm group-hover:text-blue-600">{sj.job?.customer?.name}</p>
                                            <div className="flex items-center text-[10px] text-gray-500 mt-0.5">
                                                <MapPin className="h-3 w-3 mr-1 text-red-400" />
                                                <span className="line-clamp-1">{sj.job?.location}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 bg-gray-50 p-2 rounded flex items-center justify-between pl-3 border border-gray-100">
                                        <span className="text-xs font-bold text-gray-700">Time:</span>
                                        <span className="text-xs font-black text-blue-700">
                                            {moment(sj.start_time).format('h:mm A')} - {moment(sj.end_time).format('h:mm A')}
                                        </span>
                                    </div>

                                    {/* Resources Summary */}
                                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 mt-3 pl-3">
                                        {sj.resources.length === 0 ? (
                                            <span className="text-[10px] text-gray-400 italic">No resources allocated</span>
                                        ) : (
                                            sj.resources.map((r: any, idx: number) => (
                                                <div key={idx} className="flex items-center text-[10px] bg-white border border-gray-200 shadow-sm px-2 py-1 rounded text-gray-700">
                                                    {r.resource_type === "Asset" ? <Truck className="h-3 w-3 mr-1.5 text-blue-500" /> : <Users className="h-3 w-3 mr-1.5 text-orange-500" />}
                                                    {r.assets?.name || r.personnel?.name}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* BOTTOM 2/3: PROGRESS & STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Pie Chart: Status Breakdown */}
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[450px]">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Lifecycle Distribution</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5 underline">Active Jobs Only</p>
                        </div>
                        <div className="bg-gray-50 px-3 py-1 rounded-full text-[10px] font-bold text-gray-500">
                            Total Open: {statusStats.reduce((a, b) => a + b.value, 0)}
                        </div>
                    </div>

                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={1500}
                                >
                                    {statusStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[STATUS_ORDER.indexOf(entry.name) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Legend
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                    iconType="circle"
                                    formatter={(value: any) => <span className="text-xs font-bold text-gray-600">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right Column: Quick Actions / System Health */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white">
                        <h3 className="text-lg font-bold mb-4 flex items-center">
                            <Truck className="h-5 w-5 mr-2 text-blue-400" />
                            Dispatcher Tools
                        </h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => router.push('/schedule')}
                                className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-left px-4 flex items-center justify-between group"
                            >
                                <span className="text-sm font-bold">Launch Schedule Engine</span>
                                <ArrowUpRight className="h-4 w-4 text-gray-500 group-hover:text-blue-400" />
                            </button>
                            <button
                                onClick={() => router.push('/dockets')}
                                className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-left px-4 flex items-center justify-between group"
                            >
                                <span className="text-sm font-bold">Batch Release Dockets</span>
                                <ArrowUpRight className="h-4 w-4 text-gray-500 group-hover:text-green-400" />
                            </button>
                            <button
                                onClick={() => router.push('/reports')}
                                className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-left px-4 flex items-center justify-between group"
                            >
                                <span className="text-sm font-bold">Generate Fleet Report</span>
                                <ArrowUpRight className="h-4 w-4 text-gray-500 group-hover:text-yellow-400" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 text-blue-100">Quick Insight</p>
                            {unscheduledJobs.length > 0 ? (
                                <>
                                    <h4 className="text-xl font-black mb-2">Action Required</h4>
                                    <p className="text-sm opacity-90 leading-relaxed font-medium">
                                        You have {unscheduledJobs.length} booked {unscheduledJobs.length === 1 ? 'job' : 'jobs'} awaiting scheduling. Review the unscheduled queue to allocate resources.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h4 className="text-xl font-black mb-2">All Caught Up!</h4>
                                    <p className="text-sm opacity-90 leading-relaxed font-medium">
                                        There are no booked jobs waiting to be scheduled. Great work keeping the pipeline clear!
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="absolute -bottom-10 -right-10 opacity-10">
                            <Calendar className="h-40 w-40" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Job Details Modal Overlay */}
            {activeJobId && (
                <GrowingForm
                    open={!!activeJobId}
                    onClose={() => {
                        setActiveJobId(null);
                        fetchDashboardData();
                    }}
                    jobId={activeJobId}
                />
            )}

            {/* Scheduling Modal */}
            {schedulingJobId && (
                <ScheduleJobModal
                    isOpen={!!schedulingJobId}
                    onClose={() => setSchedulingJobId(null)}
                    jobId={schedulingJobId}
                    onScheduled={() => {
                        setSchedulingJobId(null);
                        fetchDashboardData();
                    }}
                />
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
