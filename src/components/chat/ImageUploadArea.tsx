import React, { useState } from "react";
import { cn } from "../../utils/cn";
import { ImageUploadButton } from "./ImageUploadButton";
import { ImagePreview } from "./ImagePreview";

interface ImageUploadAreaProps {
  images: string[];
  onImagesSelected: (images: string[]) => void;
  onRemoveImage: (index: number) => void;
  disabled?: boolean;
  visionEnabled?: boolean;
  className?: string;
}

export const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({
  images,
  onImagesSelected,
  onRemoveImage,
  disabled = false,
  visionEnabled = false,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!visionEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!visionEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!visionEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newImages.push(base64);
    }

    if (newImages.length > 0) {
      onImagesSelected(newImages);
    }
  };

  const handleImagesSelected = (newImages: string[]) => {
    onImagesSelected(newImages);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 relative",
        isDragOver && "ring-2 ring-dash-accent/50 rounded-lg",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {images.length > 0 && (
        <ImagePreview images={images} onRemove={onRemoveImage} className="px-1" />
      )}
      <div className="flex items-end gap-1.5">
        <ImageUploadButton
          onImagesSelected={handleImagesSelected}
          disabled={disabled}
        />
      </div>
    </div>
  );
};