// app/page.tsx

import MapComponent from "@/components/tutorial/map";
import AnimatedTabs from "@/components/animated-tabs";
import { DragCloseDrawerExample } from "@/components/swipe-up-drawer";

export default function Home() {
  return (
    <main className="h-full w-full bg-white relative">
      <div className="hidden md:flex w-80 bg-white/80 backdrop-blur-xl h-full border-r border-gray-200/50  flex-col absolute z-20">
        <div className="p-4 flex justify-center items-center border-b border-gray-200/50">
          <h1 className="font-semibold text-xl text-neutral-900">
            FIU Citation Tracker
          </h1>
        </div>
        <AnimatedTabs />
      </div>
      <div className="md:hidden absolute z-20">
        <DragCloseDrawerExample />
      </div>
      {/*the map */}
      <MapComponent />
    </main>
  );
}
