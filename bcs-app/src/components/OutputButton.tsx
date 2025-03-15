import React from "react";
import { Button } from "../ui/button";

interface OutputButtonProps {
  onClick: () => void;
}

const OutputButton: React.FC<OutputButtonProps> = ({ onClick }) => {
  return (
    <Button variant="outline" onClick={onClick}>
    Output
    </Button>
  );
};

export default OutputButton;