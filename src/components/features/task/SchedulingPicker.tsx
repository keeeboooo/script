"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { springTransition } from "@/lib/motion";
import { getTodayStr, getTomorrowStr, getWeekendStr, formatDateLabel } from "@/lib/date";

interface SchedulingPickerProps {
  onSchedule: (date: string, time?: string) => void;
  onSkip: () => void;
  defaultDate?: string;
  defaultTime?: string;
  compact?: boolean;
  taskTitle?: string;
}

type TimeSlot = "朝" | "昼" | "夜" | "指定";

const TIME_SLOT_VALUES: Record<Exclude<TimeSlot, "指定">, string> = {
  朝: "08:00",
  昼: "12:00",
  夜: "20:00",
};

export function SchedulingPicker({
  onSchedule,
  onSkip,
  defaultDate,
  defaultTime,
  compact = false,
  taskTitle,
}: SchedulingPickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate ?? "");
  const [showTimePicker, setShowTimePicker] = useState(!!defaultTime);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [customTime, setCustomTime] = useState(defaultTime ?? "");
  const [showCalendar, setShowCalendar] = useState(false);

  const quickDates = useMemo(() => [
    { label: "今日", value: getTodayStr() },
    { label: "明日", value: getTomorrowStr() },
    { label: "今週末", value: getWeekendStr() },
  ], []);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setShowTimePicker(true);
    setShowCalendar(false);
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    if (slot !== "指定") {
      setCustomTime(TIME_SLOT_VALUES[slot]);
    }
  };

  const handleConfirm = () => {
    if (!selectedDate) return;
    let time: string | undefined;
    if (showTimePicker && selectedTimeSlot) {
      if (selectedTimeSlot === "指定") {
        time = customTime || undefined;
      } else {
        time = TIME_SLOT_VALUES[selectedTimeSlot];
      }
    }
    onSchedule(selectedDate, time);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={springTransition}
      className={cn(
        "glass rounded-2xl border border-foreground/10 overflow-hidden",
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            いつやりますか？
          </p>
          {taskTitle && (
            <p className="text-xs text-muted-foreground pl-5 truncate max-w-[220px]">
              {taskTitle}
            </p>
          )}
        </div>
        <motion.button
          onClick={onSkip}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          whileTap={{ scale: 0.9 }}
          transition={springTransition}
          aria-label="スキップ"
        >
          <X className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Quick date buttons */}
      <div className="flex gap-2 mb-2">
        {quickDates.map((qd) => (
          <motion.button
            key={qd.value}
            onClick={() => handleDateSelect(qd.value)}
            className={cn(
              "flex-1 py-1.5 rounded-xl text-xs font-medium transition-all border",
              selectedDate === qd.value
                ? "bg-foreground text-background border-foreground"
                : "bg-secondary/30 border-foreground/10 text-foreground/70 hover:bg-secondary/50 hover:text-foreground"
            )}
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
          >
            {qd.label}
          </motion.button>
        ))}
      </div>

      {/* Calendar toggle */}
      <motion.button
        onClick={() => setShowCalendar((prev) => !prev)}
        className="w-full flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors mb-2"
        whileTap={{ scale: 0.98 }}
        transition={springTransition}
      >
        <Calendar className="w-3.5 h-3.5" />
        {selectedDate && !quickDates.find((qd) => qd.value === selectedDate)
          ? `📅 ${formatDateLabel(selectedDate)}`
          : "📅 カレンダーから選ぶ"}
      </motion.button>

      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={springTransition}
            className="overflow-hidden mb-2"
          >
            <input
              type="date"
              value={selectedDate}
              min={getTodayStr()}
              onChange={(e) => handleDateSelect(e.target.value)}
              className="w-full bg-secondary/20 border border-foreground/10 rounded-xl px-3 py-1.5 text-sm text-foreground outline-none focus:border-foreground/30 transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time picker — only shown after a date is selected */}
      <AnimatePresence>
        {showTimePicker && selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={springTransition}
            className="overflow-hidden"
          >
            <div className="border-t border-foreground/10 pt-2 mt-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <Clock className="w-3 h-3" />
                時間も決める（任意）
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {(["朝", "昼", "夜", "指定"] as TimeSlot[]).map((slot) => (
                  <motion.button
                    key={slot}
                    onClick={() => handleTimeSlotSelect(slot)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-medium transition-all border",
                      selectedTimeSlot === slot
                        ? "bg-foreground text-background border-foreground"
                        : "bg-secondary/30 border-foreground/10 text-foreground/70 hover:bg-secondary/50 hover:text-foreground"
                    )}
                    whileTap={{ scale: 0.95 }}
                    transition={springTransition}
                  >
                    {slot}
                  </motion.button>
                ))}
              </div>

              <AnimatePresence>
                {selectedTimeSlot === "指定" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={springTransition}
                    className="overflow-hidden mt-2"
                  >
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="bg-secondary/20 border border-foreground/10 rounded-xl px-3 py-1.5 text-sm text-foreground outline-none focus:border-foreground/30 transition-colors"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-foreground/10">
        <motion.button
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-lg hover:bg-secondary/30"
          whileTap={{ scale: 0.95 }}
          transition={springTransition}
        >
          後で決める
        </motion.button>
        <motion.button
          onClick={handleConfirm}
          disabled={!selectedDate}
          className={cn(
            "text-xs font-medium px-4 py-1.5 rounded-xl transition-all",
            selectedDate
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-secondary/30 text-muted-foreground cursor-not-allowed"
          )}
          whileTap={selectedDate ? { scale: 0.95 } : {}}
          transition={springTransition}
        >
          決定
        </motion.button>
      </div>
    </motion.div>
  );
}
