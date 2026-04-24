export default function Loading() {
  return (
    <div className="pb-20 pt-10 lg:pb-28">
      <div className="mx-auto w-[min(1200px,calc(100%-1.5rem))] space-y-6">
        <div className="h-36 animate-pulse rounded-[40px] bg-white/70" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-[420px] animate-pulse rounded-[32px] bg-white/70" />
          ))}
        </div>
      </div>
    </div>
  );
}
