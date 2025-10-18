"use client";
import React, { useState, useEffect } from "react";
import { useDragControls, useMotionValue, animate, motion, PanInfo } from "framer-motion";
import LatestCitation from "./latest-citation";

const DragCloseDrawer = ({ children }: { children: React.ReactNode }) => {
  const [windowHeight, setWindowHeight] = useState(0);
  const y = useMotionValue(0);

  useEffect(() => {
    const wh = window.innerHeight;
    setWindowHeight(wh);
    y.set(wh * (1 - 1 / 3));
  }, [y]);

  const controls = useDragControls();

  const onDragEnd = (_: any, info: PanInfo) => {
    const fullyOpenY = windowHeight * 0.2;
    const regularY = windowHeight * (1 - 1 / 3);
    const minimizedY = windowHeight - 80;

    const currentY = y.get();
    const velocityY = info.velocity.y;

    const projectedY = currentY + velocityY * 0.2;

    const snapPoints = [fullyOpenY, regularY, minimizedY];

    const closestSnapPoint = snapPoints.reduce((closest, point) => {
      return Math.abs(projectedY - point) < Math.abs(projectedY - closest) ? point : closest;
    });

    animate(y, closestSnapPoint, {
      type: "spring",
      damping: 20,
      stiffness: 300,
    });
  };

  if (!windowHeight) {
    return null;
  }

  return (
    <motion.div
      id="drawer"
      onClick={(e) => e.stopPropagation()}
      className="fixed top-0 left-0 right-0 w-full h-full rounded-t-3xl bg-neutral-900"
      style={{ y }}
      drag="y"
      dragControls={controls}
      onDragEnd={onDragEnd}
      dragListener={false}
      dragConstraints={{
        top: 0,
        bottom: windowHeight,
      }}
      dragElastic={{
        top: 0.5,
        bottom: 0.5,
      }}
    >
      <div
        onPointerDown={(e) => {
          controls.start(e);
        }}
        className="absolute left-0 right-0 top-0 z-10 flex h-12 cursor-grab touch-none items-center justify-center rounded-t-3xl bg-neutral-900 active:cursor-grabbing"
      >
        <div className="h-2 w-14 rounded-full bg-neutral-700" />
      </div>
      <div className="relative z-0 h-full overflow-y-scroll p-4 pt-12">{children}</div>
    </motion.div>
  );
};

export const DragCloseDrawerExample = () => {
  return (
    <div className="grid h-screen place-content-center bg-neutral-950">
      <DragCloseDrawer>
        <div className="mx-auto max-w-2xl space-y-4 text-neutral-400">
          <LatestCitation />
        </div>
      </DragCloseDrawer>
    </div>
  );
};
