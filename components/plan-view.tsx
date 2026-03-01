"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  Circle,
  Calendar,
  Check,
  ListChecks,
  MapPin,
} from "lucide-react";
import type { PlanResult } from "@/lib/types";

interface PlanViewProps {
  plan: PlanResult;
}

export function PlanView({ plan }: PlanViewProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    setCheckedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const completedCount = checkedItems.size;
  const totalCount = plan.checklist?.length || 0;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-foreground/5 rounded-full">
          <Calendar className="w-3.5 h-3.5 text-foreground/60" />
          <span className="text-[11px] font-semibold text-foreground/60 uppercase tracking-widest">
            Your Plan
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
          {plan.plan_title || "Your Action Plan"}
        </h2>
        {/* Stats row */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          {plan.schedule && plan.schedule.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {plan.schedule.length} steps
            </span>
          )}
          {totalCount > 0 && (
            <span className="flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" />
              {totalCount} items
            </span>
          )}
        </div>
      </motion.div>

      {/* Schedule Timeline */}
      {plan.schedule && plan.schedule.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border overflow-hidden"
        >
          <div className="flex items-center gap-2 px-5 py-3.5 bg-foreground/[0.03] border-b border-border">
            <Clock className="w-4 h-4 text-foreground/70" />
            <h3 className="text-sm font-semibold text-foreground">Schedule</h3>
          </div>

          <div className="p-4 sm:p-5">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

              <div className="space-y-1">
                {plan.schedule.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.04 }}
                    className="flex gap-4 relative group py-2.5"
                  >
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0 w-[31px] h-[31px] rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold shadow-sm">
                      {index + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span className="text-xs font-semibold text-foreground/60 bg-foreground/[0.06] px-2.5 py-1 rounded-md w-fit font-mono tracking-tight">
                          {item.time}
                        </span>
                        <span className="text-sm text-foreground font-medium leading-snug">
                          {item.activity}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Checklist */}
      {plan.checklist && plan.checklist.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 bg-foreground/[0.03] border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-foreground/70" />
              <h3 className="text-sm font-semibold text-foreground">
                Checklist
              </h3>
            </div>
            <div className="flex items-center gap-2.5">
              {/* Progress bar */}
              <div className="w-16 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-foreground"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {plan.checklist.map((item, index) => {
                const isChecked = checkedItems.has(index);
                return (
                  <motion.button
                    key={index}
                    type="button"
                    onClick={() => toggleItem(index)}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.025 }}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left w-full ${
                      isChecked
                        ? "bg-foreground/[0.04]"
                        : "hover:bg-foreground/[0.03]"
                    }`}
                  >
                    <div
                      className={`w-[18px] h-[18px] rounded-md border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        isChecked
                          ? "bg-foreground border-foreground"
                          : "border-foreground/25 hover:border-foreground/40"
                      }`}
                    >
                      {isChecked && (
                        <Check className="w-2.5 h-2.5 text-background" />
                      )}
                    </div>
                    <span
                      className={`text-sm transition-all duration-200 ${
                        isChecked
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {item}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {(!plan.schedule || plan.schedule.length === 0) &&
        (!plan.checklist || plan.checklist.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No plan items were extracted.</p>
            <p className="text-sm mt-1 opacity-70">
              Try speaking more details about your schedule, activities, or
              items needed.
            </p>
          </div>
        )}
    </div>
  );
}
