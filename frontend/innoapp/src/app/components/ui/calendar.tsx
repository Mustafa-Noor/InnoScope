"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export function Calendar({
  className,
  showOutsideDays = true,
  ...props
}) {
  return (
    <div
      className="calendar-container"
      style={{
        padding: "16px",
        borderRadius: "8px",
        background: "#fafafa",
        border: "1px solid #ddd",
        display: "inline-block",
      }}
    >
      <DayPicker
        showOutsideDays={showOutsideDays}
        {...props}
        // v9 allows full custom icons like this:
        components={{
          Nav: (navProps) => (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <button
                onClick={() => navProps.onPrevClick()}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  opacity: 0.7,
                }}
              >
                <ChevronLeft size={18} />
              </button>

              <div style={{ fontWeight: "600" }}>{navProps.labels.calendarMonth}</div>

              <button
                onClick={() => navProps.onNextClick()}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  opacity: 0.7,
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ),
        }}
        classNames={{
          day: "rdp-day custom-day",
        }}
      />
      <style>{`
        .custom-day {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
        }
        .custom-day:hover {
          background: #eee;
        }
        .rdp-day_selected {
          background: #007bff !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
}
