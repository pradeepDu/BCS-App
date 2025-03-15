import React, { useState } from "react";
import { Button } from "../ui/button";
import Modal from "../ui/modal";
import LogsPage from "./LogsPage";
import ProcessesPage from "./ProcessesPage";
import InputsPage from "./InputsPage";

const InputButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"logs" | "processes" | "inputs">(
    "logs"
  );

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Input Details
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="p-4 bg-gray-900 text-white rounded-lg w-[400px]">
          <h2 className="text-xl font-bold mb-4">Input Details</h2>
          <div className="flex gap-2 mb-4">
            <button
              className={`px-4 py-2 rounded ${
                activeTab === "logs" ? "bg-blue-500" : "bg-gray-700"
              }`}
              onClick={() => setActiveTab("logs")}
            >
              Logs
            </button>
            <button
              className={`px-4 py-2 rounded ${
                activeTab === "processes" ? "bg-blue-500" : "bg-gray-700"
              }`}
              onClick={() => setActiveTab("processes")}
            >
              Processes
            </button>
            <button
              className={`px-4 py-2 rounded ${
                activeTab === "inputs" ? "bg-blue-500" : "bg-gray-700"
              }`}
              onClick={() => setActiveTab("inputs")}
            >
              Inputs
            </button>
          </div>

          {activeTab === "logs" && <LogsPage />}
          {activeTab === "processes" && <ProcessesPage />}
          {activeTab === "inputs" && <InputsPage />}
        </div>
      </Modal>
    </>
  );
};

export default InputButton;