import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingCart, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGuest } from '../../contexts/GuestContext';
import ProductImage from '../Common/ProductImage';
import toast from 'react-hot-toast';

const ProductCard = ({ product, showMatchScore = false, className = '' }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, addToFavorites, removeFromFavorites } = useAuth();
  const { addViewedProduct } = useGuest();

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please login to add favorites');
      return;
    }

    setIsLoading(true);
    try {
      if (isFavorite) {
        await removeFromFavorites(product.id);
        setIsFavorite(false);
      } else {
        await addToFavorites(product.id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductClick = () => {
    // Track viewed product for guests
    if (!isAuthenticated) {
      addViewedProduct(product.id);
    }
  };

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please login to add favorites');
      return;
    }

    setIsLoading(true);
    try {
      if (isFavorite) {
        await removeFromFavorites(product.id);
        setIsFavorite(false);
      } else {
        await addToFavorites(product.id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPrice = () => {
    return product.salePrice || product.regularPrice;
  };

  const hasDiscount = () => {
    return product.salePrice && product.regularPrice && product.salePrice < product.regularPrice;
  };

  const getDiscountPercentage = () => {
    if (!hasDiscount()) return 0;
    return Math.round(((product.regularPrice - product.salePrice) / product.regularPrice) * 100);
  };

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group ${className}`}>
      <Link to={`/products/${product.id}`} className="block" onClick={handleProductClick}>
        {/* Enhanced Image Container */}
        <div className="relative">
          <ProductImage 
            product={product}
            size="card"
            className="w-full h-48 sm:h-56"
            quality="medium"
            lazy={true}
          />

          {/* Discount Badge */}
          {hasDiscount() && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              -{getDiscountPercentage()}%
            </div>
          )}

          {/* Match Score Badge */}
          {showMatchScore && product.matchScore && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
              {product.matchScore}% Match
            </div>
          )}

          {/* Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            disabled={isLoading}
            className={`absolute top-2 right-2 p-2 rounded-full transition-colors duration-200 ${
              showMatchScore && product.matchScore ? 'top-10' : 'top-2'
            } ${
              isFavorite
                ? 'bg-red-500 text-white'
                : 'bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Heart
              className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`}
            />
          </button>

          {/* View Count */}
          {product.viewCount > 0 && (
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>{product.viewCount}</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          {/* Brand */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">
            {product.brand}
          </p>

          {/* Product Name */}
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {product.productName}
          </h3>

          {/* Category */}
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
            {product.mainCategory}
          </p>

          {/* Rating */}
          {product.rating > 0 && (
            <div className="flex items-center space-x-1 mb-2">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {product.rating.toFixed(1)}
              </span>
              {product.reviewCount > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  ({product.reviewCount})
                </span>
              )}
            </div>
          )}

          {/* Key Ingredients */}
          {product.keyIngredients && product.keyIngredients.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {product.keyIngredients.slice(0, 3).map((ingredient, index) => (
                  <span
                    key={index}
                    className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                  >
                    {ingredient}
                  </span>
                ))}
                {product.keyIngredients.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    +{product.keyIngredients.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                {formatPrice(getCurrentPrice())}
              </span>
              {hasDiscount() && (
                <span className="text-sm text-gray-500 dark:text-gray-500 line-through">
                  {formatPrice(product.regularPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Match Reasons */}
          {showMatchScore && product.matchReasons && product.matchReasons.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {product.matchReasons[0]}
              </p>
            </div>
          )}

          {/* Formulation Traits */}
          <div className="mt-3 flex flex-wrap gap-1">
            {product.alcoholFree && (
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 py-0.5 rounded">
                Alcohol Free
              </span>
            )}
            {product.fragranceFree && (
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 py-0.5 rounded">
                Fragrance Free
              </span>
            )}
            {product.fungalAcneFree && (
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 py-0.5 rounded">
                FA Safe
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;