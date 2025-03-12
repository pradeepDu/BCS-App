import React from "react";

const Grid: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  children,
  className,
}) => {
  return (
    <div
      className={`grid ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "1rem",
      }}
    >
      {children}
    </div>
  );
};

export default Grid;