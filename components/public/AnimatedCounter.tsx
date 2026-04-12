"use client";

type Props = {
  value: number;
  className?: string;
};

export function AnimatedCounter({ value, className }: Props) {
  return (
    <span
      key={value}
      className={`inline-block tabular-nums font-black tracking-tight animate-counter-pop ${className ?? ""}`}
    >
      {value}
    </span>
  );
}
