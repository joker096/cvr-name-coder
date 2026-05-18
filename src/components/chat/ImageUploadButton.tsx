import React, { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { cn } from "../../utils/cn";

interface ImageUploadButtonProps {
  onImagesSelected: (images: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onImagesSelected,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const images: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      images.push(base64);
    }

    if (images.length > 0) {
      onImagesSelected(images);
    }

    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "p-1 rounded-md transition-all relative",
          "bg-neutral-800 hover:bg-neutral-700 text-dash-text-muted"
        )}
        title="Upload image"
      >
        <ImagePlus className="w-3 h-3" />
      </button>
    </>
  );
};
