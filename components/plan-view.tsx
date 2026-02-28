"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, Circle, Calendar, Check } from "lucide-react";
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

  return (
    <div className="space-y-6">
      {/* Plan Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-foreground/5 rounded-full mb-2">
          <Calendar className="w-4 h-4 text-foreground/70" />
          <span className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
            Your Plan
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          {plan.plan_title || "Your Action Plan"}
        </h2>
      </motion.div>

      {/* Schedule Timeline */}
      {plan.schedule && plan.schedule.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-muted/50 rounded-2xl p-4 sm:p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-foreground" />
            <h3 className="font-semibold text-foreground">Schedule</h3>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-foreground/20" />

            {/* Schedule items */}
            <div className="space-y-4">
              {plan.schedule.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="flex gap-4 relative"
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-background rounded-xl p-4 shadow-sm border border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-sm font-semibold text-foreground/70 bg-foreground/5 px-2 py-0.5 rounded w-fit">
                        {item.time}
                      </span>
                      <span className="text-foreground font-medium">
                        {item.activity}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
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
          className="bg-muted/50 rounded-2xl p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-foreground" />
              <h3 className="font-semibold text-foreground">Checklist</h3>
            </div>
            <span className="text-xs text-muted-foreground bg-foreground/5 px-2 py-1 rounded-full">
              {completedCount}/{totalCount} completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plan.checklist.map((item, index) => {
              const isChecked = checkedItems.has(index);
              return (
                <motion.button
                  key={index}
                  type="button"
                  onClick={() => toggleItem(index)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.03 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left w-full ${
                    isChecked
                      ? "bg-foreground/5 border-foreground/20"
                      : "bg-background border-border hover:border-foreground/20"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isChecked
                        ? "bg-foreground border-foreground"
                        : "border-foreground/30 group-hover:border-foreground/50"
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 text-background" />}
                  </div>
                  <span
                    className={`text-sm transition-all ${
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
        </motion.div>
      )}

      {/* Empty state */}
      {(!plan.schedule || plan.schedule.length === 0) &&
        (!plan.checklist || plan.checklist.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No schedule or checklist items were extracted.</p>
            <p className="text-sm mt-1">
              Try speaking more details about your plan.
            </p>
          </div>
        )}
    </div>
  );
}
