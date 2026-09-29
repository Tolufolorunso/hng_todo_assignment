interface TaskFlowLogoProps {
  size?: number;
  className?: string;
}

export default function TaskFlowLogo({
  size = 32,
  className = "",
}: TaskFlowLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="taskflow-logo-grad"
          x1="2"
          y1="2"
          x2="30"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient
          id="taskflow-logo-check"
          x1="9"
          y1="10"
          x2="24"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        fill="url(#taskflow-logo-grad)"
      />
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="7.5"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
      />
      <path
        d="M8.5 16.5L13.5 21.5L23.5 10.5"
        stroke="url(#taskflow-logo-check)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.5" cy="18.5" r="1.5" fill="#c7d2fe" />
    </svg>
  );
}
