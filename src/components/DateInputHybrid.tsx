import React, { useState, useEffect } from "react";
import { Calendar, X, ChevronLeft, ChevronRight } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import {
  format,
  parse,
  isValid,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
  startOfDay,
} from "date-fns";
import { id } from "date-fns/locale";

interface DateInputHybridProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
}

export default function DateInputHybrid({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  className = "",
  minDate,
  maxDate,
}: DateInputHybridProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2025, 0, 1)); // Default stable date for SSR
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Set to current date only on client to avoid hydration mismatch
    if (!value) {
      setCurrentMonth(new Date());
    }
  }, []);

  const parsedMinDate = minDate ? startOfDay(parse(minDate, "yyyy-MM-dd", new Date())) : null;
  const parsedMaxDate = maxDate ? startOfDay(parse(maxDate, "yyyy-MM-dd", new Date())) : null;

  useEffect(() => {
    if (value) {
      const date = parse(value, "yyyy-MM-dd", new Date());
      if (isValid(date)) {
        setInputValue(format(date, "dd/MM/yyyy"));
        setCurrentMonth(date);
        setIsError(false);
      }
    } else {
      setInputValue("");
      setIsError(false);
    }
  }, [value]);

  const validateAndSave = (val: string) => {
    if (!val) {
      setIsError(false);
      onChange("");
      return;
    }
    
    const parsedDate = parse(val, "dd/MM/yyyy", new Date());
    
    if (!isValid(parsedDate)) {
      setIsError(true);
      return;
    }

    const startOfParsed = startOfDay(parsedDate);

    if (parsedMinDate && isBefore(startOfParsed, parsedMinDate)) {
      setIsError(true);
      return;
    }

    if (parsedMaxDate && isAfter(startOfParsed, parsedMaxDate)) {
      setIsError(true);
      return;
    }

    setIsError(false);
    onChange(format(parsedDate, "yyyy-MM-dd"));
    setCurrentMonth(parsedDate);
  };

  const handleBlur = () => {
    if (inputValue.length === 10) {
      validateAndSave(inputValue);
    } else if (inputValue.length > 0) {
      // Revert if incomplete
      setIsError(false);
      if (value) {
        setInputValue(format(parse(value, "yyyy-MM-dd", new Date()), "dd/MM/yyyy"));
      } else {
        setInputValue("");
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9/]/g, "");
    
    // Auto-formatting (add slashes)
    if (val.length > 2 && val.charAt(2) !== '/') {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    if (val.length > 5 && val.charAt(5) !== '/') {
      val = val.slice(0, 5) + '/' + val.slice(5);
    }
    if (val.length > 10) {
      val = val.slice(0, 10);
    }

    setInputValue(val);
    
    // reset error state while typing
    if (isError) setIsError(false);

    if (val.length === 10) {
      validateAndSave(val);
    } else if (val.length === 0) {
      onChange("");
    }
  };

  const handleDateSelect = (date: Date) => {
    const formattedVal = format(date, "yyyy-MM-dd");
    onChange(formattedVal);
    setInputValue(format(date, "dd/MM/yyyy"));
    setIsError(false);
    setIsOpen(false);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setInputValue("");
    setIsError(false);
    setIsOpen(false);
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : null;

  return (
    <div className={`relative ${className}`}>
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            suppressHydrationWarning
            className={`w-full pl-3 pr-10 py-2 border rounded-lg text-sm outline-none transition-all bg-white text-slate-700 placeholder-slate-400
              ${isError 
                ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20" 
                : "border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              }`}
          />
          <div className="absolute right-2 flex items-center gap-1">
            {inputValue && (
              <button
                type="button"
                onClick={clearDate}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={14} />
              </button>
            )}
            <Popover.Trigger asChild>
              <button
                type="button"
                suppressHydrationWarning
                className="p-1 text-slate-400 hover:text-blue-600 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <Calendar size={16} />
              </button>
            </Popover.Trigger>
          </div>
        </div>

        <Popover.Portal>
          <Popover.Content
            className="z-[9999] w-64 p-4 bg-white border border-gray-100 rounded-xl shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
            sideOffset={4}
            align="end"
          >
            <div className="flex justify-between items-center mb-4">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-slate-700">
                {format(currentMonth, "MMMM yyyy", { locale: id })}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["M", "S", "S", "R", "K", "J", "S"].map((day, i) => (
                <div
                  key={i}
                  className="text-center text-[10px] font-bold text-slate-400"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {/* Empty slots for start of month alignment */}
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map(
                (_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                )
              )}
              
              {daysInMonth.map((date, i) => {
                const isSelected = selectedDate && isValid(selectedDate) && isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                const startOfCurrent = startOfDay(date);
                
                const isDisabled = 
                  (parsedMinDate && isBefore(startOfCurrent, parsedMinDate)) || 
                  (parsedMaxDate && isAfter(startOfCurrent, parsedMaxDate));
                
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isDisabled || false}
                    onClick={() => handleDateSelect(date)}
                    className={`
                      h-8 w-full rounded-lg text-xs font-medium flex items-center justify-center transition-all
                      ${isDisabled
                        ? "text-slate-300 cursor-not-allowed"
                        : isSelected
                        ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                        : isToday
                        ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        : "text-slate-700 hover:bg-slate-100"
                      }
                    `}
                  >
                    {format(date, "d")}
                  </button>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
