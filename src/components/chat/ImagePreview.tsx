import React from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

interface ImagePreviewProps {
  images: string[];
  onRemove: (index: number) => void;
  className?: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  onRemove,
  className,
}) => {
  if (images.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {images.map((img, index) => (
        <div
          key={`${img.slice(-20)}-${index}`}
          className="relative group w-16 h-16 rounded-md overflow-hidden border border-dash-border bg-dash-bg"
        >
          <img
            src={img}
            alt={`Upload preview ${index + 1}`}
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => onRemove(index)}
            className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-red-500/80 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove image"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
