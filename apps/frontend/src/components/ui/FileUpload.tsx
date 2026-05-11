import { useCallback, useState } from "react";

// Drag-and-drop plus click-to-browse file upload component
const FileUpload = ({
  label,
  onFileSelected,
  accept = "image/*",
}: {
  label: string;
  onFileSelected: (file: File) => void;
  accept?: string;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <div className="form-label">
      {label}
      <div
        className={`file-upload-dropzone ${
          isDragging ? "file-upload-dropzone--active" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p className="file-upload-text">
          Drop an image here, or{" "}
          <span className="file-upload-browse">browse from device</span>
        </p>
        <input
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="file-upload-input"
        />
      </div>
    </div>
  );
};

export default FileUpload;

