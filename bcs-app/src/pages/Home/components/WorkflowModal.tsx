import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";

interface WorkflowModalProps {
  triggerText: string;
  onSubmit: (data: { 
    file: File; 
    outputFormat: string; 
    watermark?: File 
  }) => void;
  isSubmitting?: boolean;
}

const WorkflowModal: React.FC<WorkflowModalProps> = ({ 
  triggerText, 
  onSubmit,
  isSubmitting = false 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<string>("mp4");
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleWatermarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setWatermarkFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file");
      return;
    }

    onSubmit({
      file,
      outputFormat,
      ...(watermarkFile && { watermark: watermarkFile })
    });
    
    // Don't close modal automatically if there's potential for an error
    // setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full">
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>{triggerText} Workflow</DialogTitle>
          <DialogDescription className="text-gray-300">
            Configure your {triggerText.toLowerCase()} settings
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="videoFile">Select Video File</Label>
            <Input
              id="videoFile"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="bg-gray-600"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="outputFormat">Output Format</Label>
            <Select
              value={outputFormat}
              onValueChange={setOutputFormat}
            >
              <SelectTrigger className="bg-gray-600">
                <SelectValue placeholder="Select Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4</SelectItem>
                <SelectItem value="webm">WebM</SelectItem>
                <SelectItem value="mov">MOV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="watermarkFile">Watermark Image (Optional)</Label>
            <Input
              id="watermarkFile"
              type="file"
              accept="image/*"
              onChange={handleWatermarkChange}
              className="bg-gray-600"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!file || isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Process"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowModal;