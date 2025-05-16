import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import './App.css';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [numImages, setNumImages] = useState(10);
  const [className, setClassName] = useState("object");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      setFile(acceptedFiles[0]);
      setError(null);
      setDownloadUrl(null);
    }
  });
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select an image file');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setDownloadUrl(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('num_images', numImages.toString());
      formData.append('class_name', className);
      
      const response = await axios.post('http://localhost:8000/augment/', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Create download URL for the zip file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadUrl(url);
    } catch (err) {
      setError('Error processing image. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="app">
      <h1>Image Augmentation and YOLO Annotation</h1>
      <p>Upload an image to generate augmented versions with YOLO annotations</p>
      
      <form onSubmit={handleSubmit}>
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="file-info">
              <p>Selected file: {file.name}</p>
              {file.type.startsWith('image/') && (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="image-preview"
                />
              )}
            </div>
          ) : (
            <p>{isDragActive ? 'Drop the image here' : 'Drag & drop an image, or click to select'}</p>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="numImages">Number of augmented images:</label>
          <input
            id="numImages"
            type="number"
            min="1"
            max="100"
            value={numImages}
            onChange={(e) => setNumImages(parseInt(e.target.value))}
            disabled={isLoading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="className">Class name for YOLO annotations:</label>
          <input
            id="className"
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !file}
          className="submit-button"
        >
          {isLoading ? 'Processing...' : 'Generate Augmented Images with Annotations'}
        </button>
        
        {error && <div className="error">{error}</div>}
      </form>
      
      {downloadUrl && (
        <div className="download-section">
          <h3>Processing complete!</h3>
          <p>Your download includes:</p>
          <ul>
            <li>Original image</li>
            <li>Augmented images</li>
            <li>Background-removed images in the 'results/images' folder</li>
            <li>YOLO annotations in the 'results/labels' folder</li>
          </ul>
          <a
            href={downloadUrl}
            download="augmented_data.zip"
            className="download-button"
          >
            Download All Data
          </a>
        </div>
      )}
    </div>
  );
}

export default App;