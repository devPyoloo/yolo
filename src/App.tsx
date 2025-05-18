import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import './App.css';

function App() {
  const [files, setFiles] = useState<Array<{file: File, className: string}>>([]);
  const [numImages, setNumImages] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    onDrop: acceptedFiles => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        className: ''
      }));
      setFiles(prev => [...prev, ...newFiles]);
      setError(null);
      setDownloadUrl(null);
    }
  });

  const handleClassNameChange = (index: number, value: string) => {
    setFiles(prev => prev.map((item, i) => 
      i === index ? {...item, className: value} : item
    ));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('index', index.toString());
    setActiveDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData('index'));
    if (sourceIndex === targetIndex) return;

    setFiles(prev => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(sourceIndex, 1);
      newFiles.splice(targetIndex, 0, removed);
      return newFiles;
    });

    setActiveDragIndex(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError('Please select at least one image file');
      return;
    }

    if (files.some(item => !item.className.trim())) {
      setError('Please provide a class name for each image');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setDownloadUrl(null);
    
    try {
      const formData = new FormData();
      
      files.forEach((item, _index) => {
        formData.append(`files`, item.file);
        formData.append(`class_names`, item.className);
      });
      
      formData.append('num_images', numImages.toString());

      // 'http://localhost:5100/augment/' local
      const response = await axios.post('https://www.aiocr.go-ai.one/yolo-api/augment/', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadUrl(url);
    } catch (err) {
      setError('Error processing images. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>Multi-Class Image Augmentation and YOLO Annotation</h1>
      <p>Upload images and assign class names to generate augmented versions with YOLO annotations</p>
      
      <form onSubmit={handleSubmit}>
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          <p>{isDragActive ? 'Drop the images here' : 'Drag & drop images, or click to select'}</p>
        </div>
        
        {files.length > 0 && (
          <div className="file-list-container">
            <h3>Uploaded Files ({files.length})</h3>
            <div className="file-list">
              {files.map((item, index) => (
                <div 
                  key={index}
                  className={`file-item ${activeDragIndex === index ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div className="file-header">
                    <span className="file-number">{index + 1}</span>
                    <button 
                      type="button" 
                      onClick={() => removeFile(index)}
                      className="remove-button"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                  <div className="file-preview">
                    {item.file.type.startsWith('image/') && (
                      <img
                        src={URL.createObjectURL(item.file)}
                        alt="Preview"
                        className="image-preview"
                      />
                    )}
                  </div>
                  <div className="file-controls">
                    <input
                      type="text"
                      value={item.className}
                      onChange={(e) => handleClassNameChange(index, e.target.value)}
                      placeholder="Enter class name"
                      required
                      disabled={isLoading}
                      className="class-input"
                    />
                    <div className="file-info">
                      <span className="file-name">{item.file.name}</span>
                      <span className="file-size">{(item.file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="numImages">Number of augmented images per class:</label>
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
        
        <button
          type="submit"
          disabled={isLoading || files.length === 0}
          className="submit-button"
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : (
            'Generate Augmented Images with Annotations'
          )}
        </button>
        
        {error && <div className="error">{error}</div>}
      </form>
      
      {downloadUrl && (
        <div className="download-section">
          <h3>Processing complete!</h3>
          <p>Your download includes:</p>
          <ul>
            <li>Original images</li>
            <li>Augmented images</li>
            <li>Background-removed images in the 'results/images' folder</li>
            <li>YOLO annotations in the 'results/labels' folder</li>
            <li>Class mapping in 'classes.txt'</li>
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