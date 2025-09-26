"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import useMeasure from "react-use-measure";
import LatestCitation from "./latest-citation";

const tabs = [
  {
    id: 0, // Using numbers for IDs makes direction calculation easier
    label: "Citations",
    content: (
      <div className="p-2">
        <LatestCitation />
      </div>
    ),
  },
  {
    id: 1,
    label: "Cost to Students",
    content: (
      <div className="p-4">
        <h3 className="text-xl font-bold">Parking Statistics</h3>
        <p className="mt-2 text-slate-300">
          Here you could show charts and graphs about citation frequency, popular locations, or peak
          times.
        </p>
      </div>
    ),
  },
];

// Define the animation variants for the content
const variants = {
  initial: (direction: number) => ({
    x: 300 * direction,
    opacity: 0,
    filter: "blur(4px)",
  }),
  active: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: -300 * direction,
    opacity: 0,
    filter: "blur(4px)",
  }),
};

export default function AnimatedTabs() {
  const [activeTab, setActiveTab] = useState(0);
  const [direction, setDirection] = useState(0);
  // useMeasure hook to get the height of the content for smooth animation
  const [ref, bounds] = useMeasure();

  // Memoize content to prevent unnecessary re-renders
  const content = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab)?.content || null;
  }, [activeTab]);

  const handleTabClick = (newTabId: number) => {
    if (newTabId !== activeTab) {
      // Determine the direction of the animation
      const newDirection = newTabId > activeTab ? 1 : -1;
      setDirection(newDirection);
      setActiveTab(newTabId);
    }
  };

  return (
    <div className="w-full">
      {/* Tab Navigation styled as a rounded button group */}
      <div className="flex justify-center space-x-1 bg-white p-0.5 rounded-md shadow-inner shadow-gray-200/20 m-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`relative rounded-md  w-full py-1.5 text-xs font-medium transition focus-visible:outline-1 focus-visible:outline-gray-500 ${
              activeTab === tab.id ? "text-white" : "text-slate-300 hover:text-white"
            }`}
          >
            {/* The sliding pill indicator */}
            {activeTab === tab.id && (
              <motion.span
                layoutId="bubble"
                className="absolute rounded-md inset-0 z-10 bg-white shadow-md border-[0.5px] border-gray-200"
                transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
              />
            )}
            <span className="relative z-20 text-neutral-900">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content with direction-aware animation */}
      <MotionConfig transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}>
        <motion.div
          className="relative mt-6 h-full overflow-hidden"
          initial={false}
          // Animate height to match the new content's height
          animate={{ height: bounds.height || "auto" }}
        >
          <div ref={ref}>
            <AnimatePresence custom={direction} mode="popLayout">
              <motion.div
                key={activeTab}
                variants={variants}
                initial="initial"
                animate="active"
                exit="exit"
                custom={direction}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    </div>
  );
}
