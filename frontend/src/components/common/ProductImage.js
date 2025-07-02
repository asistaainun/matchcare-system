import React, { useState, useEffect } from 'react';
import { Image, ImageOff } from 'lucide-react';

const ProductImage = ({ 
  product, 
  size = 'medium', 
  className = '', 
  quality = 'medium',
  lazy = true,
  fallbackSrc = null,
  onError = null,
  onLoad = null
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Size configurations
  const sizeConfig = {
    small: { width: 'w-16', height: 'h-16' },
    card: { width: 'w-full', height: 'h-48 sm:h-56' },
    medium: { width: 'w-64', height: 'h-64' },
    large: { width: 'w-96', height: 'h-96' },
    full: { width: 'w-full', height: 'h-full' }
  };

  const sizeClasses = sizeConfig[size] || sizeConfig.medium;

  useEffect(() => {
    const determineImageSource = () => {
      // Priority order for image sources
      const sources = [];

      // 1. Local image path (highest priority)
      if (product.localImagePath) {
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        
        // Handle different path formats
        let imagePath = product.localImagePath;
        if (imagePath.startsWith('/images/')) {
          sources.push(`${baseUrl}${imagePath}`);
        } else if (imagePath.includes('images/product')) {
          // Convert old format to new format
          const filename = imagePath.split('/').pop();
          sources.push(`${baseUrl}/images/products/${filename}`);
        } else {
          // Assume it's just a filename
          sources.push(`${baseUrl}/images/products/${imagePath}`);
        }
      }

      // 2. External image URLs
      if (product.imageUrls && Array.isArray(product.imageUrls)) {
        sources.push(...product.imageUrls.filter(url => url && url.trim()));
      }

      // 3. Single image URL (backward compatibility)
      if (product.imageUrl) {
        sources.push(product.imageUrl);
      }

      // 4. Fallback image
      if (fallbackSrc) {
        sources.push(fallbackSrc);
      }

      // 5. Default placeholder
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      sources.push(`${baseUrl}/images/placeholders/product-placeholder.svg`);

      return sources;
    };

    const tryLoadImage = async (sources) => {
      for (let i = 0; i < sources.length; i++) {
        const src = sources[i];
        if (!src) continue;

        try {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => reject(new Error(`Failed to load: ${src}`));
            img.src = src;
          });

          setImageSrc(src);
          setImageError(false);
          setIsLoading(false);
          if (onLoad) onLoad(src);
          return;
        } catch (error) {
          console.log(`Image failed to load: ${src}`);
          continue;
        }
      }

      // If all sources fail
      setImageError(true);
      setIsLoading(false);
      if (onError) onError(new Error('All image sources failed'));
    };

    const sources = determineImageSource();
    if (sources.length > 0) {
      tryLoadImage(sources);
    } else {
      setImageError(true);
      setIsLoading(false);
    }
  }, [product, fallbackSrc, onError, onLoad]);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  // Render loading placeholder
  if (isLoading) {
    return (
      <div className={`${sizeClasses.width} ${sizeClasses.height} ${className} bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center rounded-lg`}>
        <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
          <Image className="w-8 h-8 mb-2" />
          <span className="text-xs">Loading...</span>
        </div>
      </div>
    );
  }

  // Render error placeholder
  if (imageError || !imageSrc) {
    return (
      <div className={`${sizeClasses.width} ${sizeClasses.height} ${className} bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600`}>
        <ImageOff className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
        <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
          {product.productName ? `${product.productName} image` : 'Product image'}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          No image available
        </span>
      </div>
    );
  }

  // Render actual image
  return (
    <img
      src={imageSrc}
      alt={product.productName || 'Product image'}
      className={`${sizeClasses.width} ${sizeClasses.height} ${className} object-cover rounded-lg`}
      onError={handleImageError}
      onLoad={handleImageLoad}
      loading={lazy ? 'lazy' : 'eager'}
      style={{
        objectFit: 'cover',
        objectPosition: 'center'
      }}
    />
  );
};

// ProductImageGallery component for product detail page
export const ProductImageGallery = ({ 
  product, 
  onImageClick = null,
  className = ''
}) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [images, setImages] = useState([]);

  useEffect(() => {
    const collectImages = () => {
      const imageList = [];
      
      // Add local image
      if (product.localImagePath) {
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        let imagePath = product.localImagePath;
        if (imagePath.startsWith('/images/')) {
          imageList.push(baseUrl + imagePath);
        } else {
          imageList.push(`${baseUrl}/images/products/${imagePath.split('/').pop()}`);
        }
      }

      // Add external images
      if (product.imageUrls && Array.isArray(product.imageUrls)) {
        imageList.push(...product.imageUrls.filter(url => url && url.trim()));
      }

      return imageList.length > 0 ? imageList : [null];
    };

    setImages(collectImages());
  }, [product]);

  const handleThumbnailClick = (index) => {
    setSelectedImage(index);
    if (onImageClick) {
      onImageClick(images[index], index);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Image */}
      <div className="relative">
        <ProductImage
          product={{
            ...product,
            localImagePath: images[selectedImage] || product.localImagePath
          }}
          size="large"
          className="rounded-lg shadow-lg"
          lazy={false}
        />
        
        {/* Image indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded">
            {selectedImage + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === index
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <ProductImage
                product={{
                  ...product,
                  localImagePath: image
                }}
                size="small"
                className="w-16 h-16"
                lazy={true}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ImageWithFallback component for general use
export const ImageWithFallback = ({
  src,
  fallbackSrc,
  alt,
  className = '',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    setImageSrc(src);
    setError(false);
  }, [src]);

  const handleError = () => {
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    } else {
      setError(true);
    }
  };

  if (error) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}>
        <ImageOff className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
};

export default ProductImage;