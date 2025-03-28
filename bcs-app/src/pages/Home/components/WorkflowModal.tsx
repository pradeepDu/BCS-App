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
    outputFormat: string; 
    watermark?: File;
    useWatermark: boolean;
  }) => void;
  isSubmitting?: boolean;
  selectedFile: File;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const WorkflowModal: React.FC<WorkflowModalProps> = ({ 
  triggerText, 
  onSubmit,
  isSubmitting = false,
  selectedFile,
  open,
  onOpenChange
}) => {
  const [outputFormat, setOutputFormat] = useState<string>("mp4");
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [useWatermark, setUseWatermark] = useState<boolean>(false);

  const handleWatermarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setWatermarkFile(e.target.files[0]);
      setUseWatermark(true);
    } else {
      setUseWatermark(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      outputFormat,
      ...(watermarkFile && { watermark: watermarkFile }),
      useWatermark: useWatermark && watermarkFile !== null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full bg-white text-black hover:bg-gray-100">
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>{triggerText} Workflow</DialogTitle>
          <DialogDescription className="text-gray-300">
            Configure your {triggerText.toLowerCase()} settings for: {selectedFile.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                <SelectItem value="avi">AVI</SelectItem>
                <SelectItem value="mkv">MKV</SelectItem>
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
              onClick={() => onOpenChange?.(false)}
              className="bg-white text-black hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-white text-black hover:bg-gray-100"
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