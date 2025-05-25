const LoaderDotted = () => (
  <div className="flex items-center justify-center space-x-2">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="h-1.5 w-1.5 rounded-full bg-[#30303080] animate-pulse-shift"
        style={{ animationDelay: `${i * 0.2}s` }}
      ></div>
    ))}
  </div>
);

export default LoaderDotted;
