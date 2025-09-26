import MapComponent from "@/components/tutorial/map";
import AnimatedTabs from "@/components/animated-tabs";

export default function Home() {
  return (
    <main className="h-full w-full bg-yellow-400 relative">
      <div className="w-80 bg-white/80 backdrop-blur-xl h-full border-r border-gray-200/50 flex flex-col absolute z-20">
        <div className="p-4 flex justify-center items-center border-b border-gray-200/50">
          <h1 className="font-semibold text-xl text-gray-500">FIU Citation Tracker</h1>
        </div>
        <AnimatedTabs />
      </div>
      {/* <MapComponent /> */}
    </main>
  );
}
