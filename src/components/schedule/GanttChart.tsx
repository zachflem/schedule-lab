"use client";

import { useState, useEffect } from "react";
import moment from "moment";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface GanttChartProps {
    onJobClick?: (jobId: string) => void;
    onScheduleChange?: (jobId?: string) => void;
}

type ViewMode = 'day' | 'week' | 'month';

export function GanttChart({ onJobClick, onScheduleChange }: GanttChartProps) {
    // State
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [currentDate, setCurrentDate] = useState(moment().startOf('day'));
    const [isLoading, setIsLoading] = useState(true);

    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [dragOffsetX, setDragOffsetX] = useState<number>(0);
    const [dragOffsetMs, setDragOffsetMs] = useState<number>(0);

    const [groups, setGroups] = useState<{ id: string; title: string }[]>([]);
    const [items, setItems] = useState<{ id: string; job_id?: string; group: string; title: string; start_time: number; end_time: number; bgColor: string; borderColor: string }[]>([]);

    const fetchScheduleData = async () => {
        setIsLoading(true);

        // Fetch Assets (Groups)
        const { data: assets } = await createClient().from("assets").select("*").order("name");

        let initialGroups: { id: string; title: string }[] = [];
        if (assets) {
            initialGroups = assets.map((a: any) => ({
                id: a.id,
                title: `${a.name} (${a.category})`
            }));
        }

        // Add Unassigned group
        initialGroups.push({ id: "unassigned", title: "Unassigned Assets" });
        setGroups(initialGroups);

        // Time range for querying
        let queryStart = currentDate.clone();
        let queryEnd = currentDate.clone();

        if (viewMode === 'day') {
            queryStart = queryStart.startOf('day');
            queryEnd = queryEnd.endOf('day');
        } else if (viewMode === 'week') {
            queryStart = queryStart.startOf('week');
            queryEnd = queryEnd.endOf('week');
        } else if (viewMode === 'month') {
            queryStart = queryStart.startOf('month');
            queryEnd = queryEnd.endOf('month');
        }

        // Fetch Allocations (Items)
        const { data: allocations, error: allocError } = await createClient()
            .from("allocations")
            .select(`
                id,
                asset_id,
                job_id,
                start_time,
                end_time,
                jobs (
                    id,
                    status_id,
                    customers ( name )
                )
            `)
            .lte('start_time', queryEnd.toISOString())
            .gte('end_time', queryStart.toISOString());

        // Fetch Job Schedules (Fallback for unassigned)
        const { data: schedules } = await createClient()
            .from("job_schedules")
            .select(`
                id,
                job_id,
                start_time,
                end_time,
                jobs (
                    id,
                    status_id,
                    customers ( name )
                )
            `)
            .lte('start_time', queryEnd.toISOString())
            .gte('end_time', queryStart.toISOString());

        let mappedItems: any[] = [];

        if (allocations) {
            mappedItems = allocations.filter((a: any) => a.asset_id).map((alloc: any) => {
                const job = Array.isArray(alloc.jobs) ? alloc.jobs[0] : alloc.jobs;
                const customerName = job?.customers?.name || 'Unknown Customer';
                const isCompleted = job?.status_id === 'Completed' || job?.status_id === 'Invoiced' || job?.status_id === 'Paid';

                return {
                    id: alloc.id,
                    job_id: job?.id,
                    group: alloc.asset_id,
                    title: `${customerName} - ${job?.status_id || 'Scheduled'}`,
                    start_time: new Date(alloc.start_time).getTime(),
                    end_time: new Date(alloc.end_time).getTime(),
                    bgColor: isCompleted ? "bg-green-500" : "bg-blue-500",
                    borderColor: isCompleted ? "border-green-600" : "border-blue-600"
                };
            });
        }

        if (schedules) {
            const allocJobIds = allocations ? allocations.map((a: any) => a.job_id) : [];
            schedules.forEach((sch: any) => {
                const job = Array.isArray(sch.jobs) ? sch.jobs[0] : sch.jobs;
                if (!job) return;

                // If this job has no asset allocations, put it in unassigned
                if (!allocJobIds.includes(sch.job_id)) {
                    const customerName = job?.customers?.name || 'Unknown Customer';
                    const isCompleted = job?.status_id === 'Completed' || job?.status_id === 'Invoiced' || job?.status_id === 'Paid';

                    mappedItems.push({
                        id: sch.id,
                        job_id: job.id,
                        group: "unassigned",
                        title: `${customerName} - ${job.status_id || 'Scheduled'}`,
                        start_time: new Date(sch.start_time).getTime(),
                        end_time: new Date(sch.end_time).getTime(),
                        bgColor: isCompleted ? "bg-green-500" : "bg-gray-500",
                        borderColor: isCompleted ? "border-green-600" : "border-gray-600"
                    });
                }
            });
        }

        setItems(mappedItems);

        setIsLoading(false);
    };

    useEffect(() => {
        fetchScheduleData();
    }, [currentDate, viewMode]);

    // View Configuration
    const startHour = 5; // 5 AM
    const endHour = 20; // 8 PM

    // Derived Time Ranges based on viewMode
    let rangeStart = moment();
    let rangeEnd = moment();
    let columns: { key: string; label: string; subLabel?: string }[] = [];

    if (viewMode === 'day') {
        rangeStart = currentDate.clone().add(startHour, 'hours');
        rangeEnd = currentDate.clone().add(endHour, 'hours');

        for (let h = startHour; h < endHour; h++) {
            columns.push({
                key: `h-${h}`,
                label: moment().hour(h).format('ha')
            });
        }
    } else if (viewMode === 'week') {
        rangeStart = currentDate.clone().startOf('week');
        rangeEnd = currentDate.clone().endOf('week');

        for (let i = 0; i < 7; i++) {
            const day = rangeStart.clone().add(i, 'days');
            columns.push({
                key: `d-${i}`,
                label: day.format('ddd'),
                subLabel: day.format('D MMM')
            });
        }
    } else if (viewMode === 'month') {
        rangeStart = currentDate.clone().startOf('month');
        rangeEnd = currentDate.clone().endOf('month');

        const daysInMonth = rangeStart.daysInMonth();
        for (let i = 0; i < daysInMonth; i++) {
            const day = rangeStart.clone().add(i, 'days');
            columns.push({
                key: `d-${i}`,
                label: day.format('D'),
                subLabel: day.format('dd').substring(0, 1)
            });
        }
    }

    const totalMs = rangeEnd.valueOf() - rangeStart.valueOf();

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetGroupId: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-50/50');

        // Handle External drop (Unscheduled Job)
        const dataStr = e.dataTransfer.getData('application/json');
        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                if (data.type === 'unscheduled' && data.id) {
                    const trackRect = e.currentTarget.getBoundingClientRect();
                    const dropX = e.clientX - trackRect.left;
                    const leftPercent = dropX / trackRect.width;
                    let newStartMs = rangeStart.valueOf() + (leftPercent * totalMs);

                    const snapMs = 15 * 60 * 1000;
                    newStartMs = Math.round(newStartMs / snapMs) * snapMs;
                    const newEndMs = newStartMs + (4 * 60 * 60 * 1000); // 4 hours default

                    if (targetGroupId !== 'unassigned') {
                        const groupItems = items.filter(i => i.group === targetGroupId);
                        const hasCollision = groupItems.some(existing => {
                            return (newStartMs < existing.end_time) && (newEndMs > existing.start_time);
                        });
                        if (hasCollision) {
                            alert("This asset is already booked during this selected time.");
                            return;
                        }
                    }

                    try {
                        await createClient().from("job_schedules").insert({
                            job_id: data.id,
                            start_time: new Date(newStartMs).toISOString(),
                            end_time: new Date(newEndMs).toISOString()
                        });

                        if (targetGroupId !== 'unassigned') {
                            await createClient().from("allocations").insert({
                                job_id: data.id,
                                asset_id: targetGroupId,
                                start_time: new Date(newStartMs).toISOString(),
                                end_time: new Date(newEndMs).toISOString()
                            });
                        }
                        await createClient().from("jobs").update({ status_id: 'Job Scheduled' }).eq("id", data.id);

                        if (onScheduleChange) onScheduleChange(data.id);
                        fetchScheduleData();
                    } catch (err) {
                        console.error("Failed to schedule job via drop", err);
                    }
                    return;
                }
            } catch (err) {
                // Ignore parse errors from other drag sources
            }
        }

        if (!draggedItemId) return;

        const item = items.find(i => i.id === draggedItemId);
        if (!item || !item.job_id) return;

        // Calculate time from pixel drop
        const trackRect = e.currentTarget.getBoundingClientRect();
        const dropX = e.clientX - trackRect.left;

        // We calculate the new start time by subtracting the offset the user grabbed the block at
        const leftPercent = dropX / trackRect.width;
        let newStartMs = rangeStart.valueOf() + (leftPercent * totalMs) - dragOffsetMs;

        // Snap to nearest 15 minutes
        const snapMs = 15 * 60 * 1000;
        newStartMs = Math.round(newStartMs / snapMs) * snapMs;

        const durationMs = item.end_time - item.start_time;
        const newEndMs = newStartMs + durationMs;

        // 1. Check subset collisions for Assets (ignore unassigned)
        if (targetGroupId !== 'unassigned') {
            const groupItems = items.filter(i => i.group === targetGroupId && i.id !== item.id);
            const hasCollision = groupItems.some(existing => {
                return (newStartMs < existing.end_time) && (newEndMs > existing.start_time);
            });

            if (hasCollision) {
                alert("This asset is already booked during this selected time.");
                setDraggedItemId(null);
                return;
            }
        }

        // 2. Optimistic Update
        setItems(prev => prev.map(i => i.id === item.id ? {
            ...i,
            group: targetGroupId,
            start_time: newStartMs,
            end_time: newEndMs
        } : i));

        setDraggedItemId(null);

        // 3. Database Update
        try {
            // Update the core job_schedule to keep the master schedule in sync
            await createClient().from("job_schedules")
                .update({
                    start_time: new Date(newStartMs).toISOString(),
                    end_time: new Date(newEndMs).toISOString()
                })
                .eq("job_id", item.job_id);

            if (item.group === 'unassigned' && targetGroupId !== 'unassigned') {
                // Moving from Unassigned -> Asset (Create Allocation)
                await createClient().from("allocations").insert({
                    job_id: item.job_id,
                    asset_id: targetGroupId,
                    start_time: new Date(newStartMs).toISOString(),
                    end_time: new Date(newEndMs).toISOString()
                });
            } else if (item.group !== 'unassigned' && targetGroupId === 'unassigned') {
                // Moving from Asset -> Unassigned (Delete Allocation)
                // Note: item.id is the allocation ID
                await createClient().from("allocations").delete().eq("id", item.id);
            } else if (item.group !== 'unassigned' && targetGroupId !== 'unassigned') {
                // Moving Asset -> Asset (Update Allocation)
                await createClient().from("allocations")
                    .update({
                        asset_id: targetGroupId,
                        start_time: new Date(newStartMs).toISOString(),
                        end_time: new Date(newEndMs).toISOString()
                    })
                    .eq("id", item.id);
            }

            // Unallocate personnel if checking for clashes (simplified: clear personnel on significant move)
            // For MVP, we will let the user manage personnel separately, or we could delete personnel allocations here
            // await createClient().from("allocations").delete().eq("job_id", item.job_id).not("personnel_id", "is", null);

            // Refresh to get new IDs
            fetchScheduleData();
        } catch (err) {
            console.error("Failed to save move", err);
            fetchScheduleData(); // Revert on failure
        }
    };

    // Navigation Handlers
    const handleNext = () => {
        if (viewMode === 'day') setCurrentDate(prev => prev.clone().add(1, 'day'));
        if (viewMode === 'week') setCurrentDate(prev => prev.clone().add(1, 'week'));
        if (viewMode === 'month') setCurrentDate(prev => prev.clone().add(1, 'month'));
    };

    const handlePrev = () => {
        if (viewMode === 'day') setCurrentDate(prev => prev.clone().subtract(1, 'day'));
        if (viewMode === 'week') setCurrentDate(prev => prev.clone().subtract(1, 'week'));
        if (viewMode === 'month') setCurrentDate(prev => prev.clone().subtract(1, 'month'));
    };

    const handleToday = () => {
        setCurrentDate(moment().startOf('day'));
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-full h-full flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={fetchScheduleData} className="p-2 border rounded hover:bg-gray-50 text-gray-600 transition-colors" title="Refresh Schedule">
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </button>
                    <button onClick={handlePrev} className="p-2 border rounded hover:bg-gray-50 text-gray-600 transition-colors hidden sm:block">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={handleToday} className="px-3 py-2 border rounded hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
                        Today
                    </button>
                    <button onClick={handleNext} className="p-2 border rounded hover:bg-gray-50 text-gray-600 transition-colors hidden sm:block">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="ml-2 sm:ml-4 text-sm sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-gray-500 hidden sm:block" />
                        {viewMode === 'day' && currentDate.format('MMMM D, YYYY')}
                        {viewMode === 'week' && `Week of ${rangeStart.format('MMM D')}`}
                        {viewMode === 'month' && currentDate.format('MMMM YYYY')}
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('day')}
                        className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", viewMode === 'day' ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900")}
                    >
                        Day
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", viewMode === 'week' ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900")}
                    >
                        Week
                    </button>
                    <button
                        onClick={() => setViewMode('month')}
                        className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", viewMode === 'month' ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900")}
                    >
                        Month
                    </button>
                </div>
            </div>

            <div className="mb-4 flex gap-4 text-xs font-medium text-gray-600">
                <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-2 shadow-sm"></span> Quote</div>
                <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2 shadow-sm"></span> Scheduled</div>
                <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2 shadow-sm"></span> Completed</div>
            </div>

            {/* Gantt Area */}
            <div className="flex-1 border border-gray-200 rounded-lg overflow-x-auto overflow-y-auto custom-scrollbar">
                <div className={cn("grid", viewMode === 'month' ? "min-w-[1500px]" : "min-w-[1000px]")} style={{ gridTemplateColumns: "max-content minmax(0, 1fr)" }}>
                    {/* Header Row */}
                    <div className="sticky top-0 left-0 z-30 border-b border-r border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-700 text-sm flex items-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap">
                        Assets & Equipment
                    </div>
                    <div className="sticky top-0 z-20 flex border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm">
                        {columns.map(col => (
                            <div key={col.key} className="flex-1 border-r border-gray-200 px-1 py-2 flex flex-col items-center justify-center text-center tracking-wide">
                                <span className={cn("font-bold text-xs uppercase", viewMode === 'day' ? "text-gray-400" : "text-gray-800")}>
                                    {col.label}
                                </span>
                                {col.subLabel && (
                                    <span className="text-[10px] text-gray-500 font-medium">{col.subLabel}</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Groups (Rows) */}
                    {groups.map((group, groupIndex) => {
                        const groupItems = items.filter(i => i.group === group.id);
                        const isLast = groupIndex === groups.length - 1;

                        return (
                            <div key={group.id} className="contents group/row">
                                {/* Row Header */}
                                <div className={cn(
                                    "sticky left-0 z-10 px-4 py-5 font-semibold text-gray-800 text-sm flex items-center bg-white group-hover/row:bg-slate-50/50 transition-colors border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap",
                                    !isLast && "border-b border-b-gray-100"
                                )}>
                                    {group.title}
                                </div>

                                {/* Timeline Track */}
                                <div
                                    className={cn(
                                        "flex relative h-[72px] transition-colors border-transparent overflow-hidden bg-white group-hover/row:bg-slate-50/50",
                                        !isLast && "border-b border-b-gray-100"
                                    )}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                        e.currentTarget.classList.add('bg-blue-50/50');
                                    }}
                                    onDragLeave={(e) => {
                                        e.currentTarget.classList.remove('bg-blue-50/50');
                                    }}
                                    onDrop={(e) => {
                                        e.currentTarget.classList.remove('bg-blue-50/50');
                                        handleDrop(e, group.id);
                                    }}
                                >
                                    {/* Vertical grid lines */}
                                    <div className="absolute inset-0 flex pointer-events-none">
                                        {columns.map(col => (
                                            <div key={col.key} className="flex-1 border-r border-gray-100 border-dashed opacity-70"></div>
                                        ))}
                                    </div>

                                    {/* Items */}
                                    {groupItems.map(item => {
                                        const itemStartMs = item.start_time;
                                        const itemEndMs = item.end_time;

                                        // Only render if it overlaps with current range
                                        if (itemEndMs <= rangeStart.valueOf() || itemStartMs >= rangeEnd.valueOf()) return null;

                                        const clampedStartMs = Math.max(rangeStart.valueOf(), itemStartMs);
                                        const clampedEndMs = Math.min(rangeEnd.valueOf(), itemEndMs);

                                        const leftPercent = ((clampedStartMs - rangeStart.valueOf()) / totalMs) * 100;
                                        const widthPercent = ((clampedEndMs - clampedStartMs) / totalMs) * 100;

                                        const isDragging = draggedItemId === item.id;

                                        return (
                                            <div
                                                key={item.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    setDraggedItemId(item.id);
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    // Calculate offset in MS based on where the user clicked inside the element
                                                    const clickX = e.clientX - rect.left;
                                                    const trackWidth = e.currentTarget.parentElement?.getBoundingClientRect().width || 1;
                                                    const msPerPixel = totalMs / trackWidth;
                                                    setDragOffsetMs(clickX * msPerPixel);

                                                    // Fallback for visual
                                                    e.dataTransfer.effectAllowed = "move";
                                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                                        type: 'scheduled',
                                                        job_id: item.job_id
                                                    }));
                                                }}
                                                onDragEnd={() => setDraggedItemId(null)}
                                                onClick={() => onJobClick && item.job_id && onJobClick(item.job_id)}
                                                className={cn(
                                                    "absolute top-3 bottom-3 rounded-lg shadow-sm border px-2 py-1.5 text-xs font-bold text-white flex flex-col justify-center overflow-hidden cursor-move hover:shadow-md transition-all hover:brightness-110 select-none z-10",
                                                    item.bgColor, item.borderColor,
                                                    isDragging && "opacity-50 scale-95 ring-2 ring-blue-400"
                                                )}
                                                style={{
                                                    left: `${leftPercent}%`,
                                                    width: `${widthPercent}%`,
                                                    minWidth: '20px'
                                                }}
                                                title={`${item.title} (${moment(item.start_time).format('MMM D, h:mm A')} - ${moment(item.end_time).format('MMM D, h:mm A')})`}
                                            >
                                                <span className="truncate w-full leading-tight">{item.title}</span>
                                                {viewMode !== 'month' && (
                                                    <span className="text-[9px] font-medium opacity-80 truncate mt-0.5">
                                                        {moment(item.start_time).format('h:mm A')} - {moment(item.end_time).format('h:mm A')}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {/* Groups End */}
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}
