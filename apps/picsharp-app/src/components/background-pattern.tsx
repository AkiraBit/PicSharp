import { memo } from "react";
function BackgroundPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="0.5"
            />
          </pattern>
          <pattern
            id="circles"
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="50" cy="50" r="2" fill="#e2e8f0" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#circles)" />
        <circle cx="10%" cy="10%" r="120" fill="#6366f133" fillOpacity="0.06" />
        <circle cx="85%" cy="15%" r="160" fill="#0ea5e933" fillOpacity="0.06" />
        <circle cx="15%" cy="85%" r="140" fill="#f59e0b33" fillOpacity="0.06" />
        <circle cx="90%" cy="90%" r="180" fill="#10b98133" fillOpacity="0.06" />
      </svg>
    </div>
  );
}

export default memo(BackgroundPattern);
