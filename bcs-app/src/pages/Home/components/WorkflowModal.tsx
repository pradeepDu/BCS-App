import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "../../../ui/dialog";
import { Input } from "../../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Button } from "../../../ui/button";

interface WorkflowModalProps {
  triggerText: string;
}

const WorkflowModal: React.FC<WorkflowModalProps> = ({ triggerText }) => {
  const [file, setFile] = useState<File | null>(null);
  const [translationType, setTranslationType] = useState<string>("");
  const [watermarkLogo, setWatermarkLogo] = useState<string>("");

  const handleSubmit = () => {
    console.log({
      file,
      translationType,
      watermarkLogo,
    });
    alert("Form submitted!");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">{triggerText}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>{triggerText} Configuration</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* File Upload */}
          <div className="flex flex-col gap-2">
            <label htmlFor="file-upload" className="text-sm font-medium">
              Upload File
            </label>
            <Input
              id="file-upload"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* Translation Type */}
          <div className="flex flex-col gap-2">
            <label htmlFor="translation-type" className="text-sm font-medium">
              Translation Type
            </label>
            <Select onValueChange={setTranslationType}>
              <SelectTrigger id="translation-type">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="type1">Type 1</SelectItem>
                <SelectItem value="type2">Type 2</SelectItem>
                <SelectItem value="type3">Type 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Watermark Logo */}
          <div className="flex flex-col gap-2">
            <label htmlFor="watermark-logo" className="text-sm font-medium">
              Watermark Logo
            </label>
            <Select onValueChange={setWatermarkLogo}>
              <SelectTrigger id="watermark-logo">
                <SelectValue placeholder="Select a logo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="logo1">Logo 1</SelectItem>
                <SelectItem value="logo2">Logo 2</SelectItem>
                <SelectItem value="logo3">Logo 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowModal;