import type { ReactNode } from "react";

// Simple card wrapper to keep layout consistent
const Card = ({ children }: { children: ReactNode }) => {
  return <div className="card">{children}</div>;
};

export default Card;

