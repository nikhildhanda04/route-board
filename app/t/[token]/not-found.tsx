export default function TrackNotFound() {
  return (
    <main className="min-h-screen grid place-items-center px-5 py-10">
      <div className="chart max-w-sm">
        <div className="chart-head px-4 py-2.5">Link expired</div>
        <div className="px-5 py-8">
          <h1 className="font-narrow font-bold uppercase text-xl leading-none tracking-[-0.01em]">
            This link is for one day only
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-pencil mt-3">
            Tracking links stop working at the end of the day they were sent, so nobody can watch a bus
            with an old message. The next one your school sends will open a live map again.
          </p>
        </div>
      </div>
    </main>
  );
}
