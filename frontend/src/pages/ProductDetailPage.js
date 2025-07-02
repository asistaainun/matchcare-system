import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, 
  Heart, 
  Star, 
  Share2, 
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Copy,
  Eye
} from 'lucide-react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { useGuest } from '../contexts/GuestContext';
import { apiMethods } from '../services/api';
import ProductImage, { ProductImageGallery } from '../components/Common/ProductImage';
import ProductCard from '../components/Products/ProductCard';
import LoadingSpinner, { PageLoadingSpinner, CardLoadingSkeleton } from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
import toast from 'react-hot-toast';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const { isAuthenticated, user, addToFavorites, removeFromFavorites } = useAuth();
  const { addViewedProduct } = useGuest();

  // Fetch product details
  const {
    data: product,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['product', id, user?.id],
    () => apiMethods.products.getById(id, { userId: user?.id }),
    {
      select: (response) => response.data.data,
      onSuccess: (data) => {
        // Track view for guests
        if (!isAuthenticated) {
          addViewedProduct(id);
        }
      }
    }
  );

  // Fetch similar products
  const {
    data: similarProducts,
    isLoading: similarLoading
  } = useQuery(
    ['similar-products', id],
    () => apiMethods.recommendations.getSimilar(id, { limit: 4 }),
    {
      enabled: !!product,
      select: (response) => response.data.data.similarProducts
    }
  );

  const handleFavoriteClick = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add favorites');
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        await removeFromFavorites(id);
        setIsFavorite(false);
      } else {
        await addToFavorites(id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.productName,
          text: `Check out this ${product.brand} product on MatchCare`,
          url: window.location.href
        });
      } catch (error) {
        // Fallback to copy URL
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Product link copied to clipboard!');
  };

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
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

  if (isLoading) {
    return <PageLoadingSpinner text="Loading product details..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage 
          message="Product not found"
          description="The product you're looking for doesn't exist or has been removed."
          onRetry={refetch}
          onBack={() => navigate(-1)}
        />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'ingredients', label: 'Ingredients' },
    { id: 'usage', label: 'How to Use' },
    { id: 'match', label: 'Skin Match' }
  ];

  return (
    <>
      <Helmet>
        <title>{`${product.productName} by ${product.brand} - MatchCare`}</title>
        <meta 
          name="description" 
          content={`${product.description || `Discover ${product.productName} by ${product.brand}`}. Get personalized skincare recommendations on MatchCare.`} 
        />
        <meta property="og:title" content={`${product.productName} by ${product.brand}`} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={product.localImagePath} />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Breadcrumb */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <nav className="flex items-center space-x-2 text-sm">
              <Link
                to="/"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Home
              </Link>
              <span className="text-gray-400">/</span>
              <Link
                to="/products"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Products
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 dark:text-white font-medium truncate">
                {product.productName}
              </span>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Product Images */}
            <div>
              <ProductImageGallery 
                product={product}
                onImageClick={() => {/* TODO: Implement image modal */}}
              />
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Brand and Name */}
              <div>
                <Link
                  to={`/products?brand=${product.brand}`}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  {product.brand}
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {product.productName}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {product.mainCategory}
                  {product.subcategory && ` • ${product.subcategory}`}
                </p>
              </div>

              {/* Rating and Views */}
              {(product.rating > 0 || product.viewCount > 0) && (
                <div className="flex items-center space-x-4">
                  {product.rating > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {product.rating.toFixed(1)}
                      </span>
                      {product.reviewCount > 0 && (
                        <span className="text-gray-600 dark:text-gray-400">
                          ({product.reviewCount} reviews)
                        </span>
                      )}
                    </div>
                  )}
                  
                  {product.viewCount > 0 && (
                    <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">{product.viewCount} views</span>
                    </div>
                  )}
                </div>
              )}

              {/* Match Score */}
              {product.matchScore && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-800 dark:text-green-200">
                      {product.matchScore}% Match for Your Skin
                    </span>
                  </div>
                  {product.matchReasons && product.matchReasons.length > 0 && (
                    <ul className="mt-2 text-sm text-green-700 dark:text-green-300">
                      {product.matchReasons.map((reason, index) => (
                        <li key={index} className="flex items-center space-x-1">
                          <span>•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Price */}
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(getCurrentPrice())}
                </div>
                {hasDiscount() && (
                  <>
                    <div className="text-lg text-gray-500 dark:text-gray-400 line-through">
                      {formatPrice(product.regularPrice)}
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-2 py-1 rounded text-sm font-medium">
                      -{getDiscountPercentage()}%
                    </div>
                  </>
                )}
              </div>

              {/* Key Ingredients */}
              {product.keyIngredients && product.keyIngredients.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Key Ingredients
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {product.keyIngredients.map((ingredient, index) => (
                      <Link
                        key={index}
                        to={`/ingredients?search=${ingredient}`}
                        className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        {ingredient}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulation Traits */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  What's Inside (and What Isn't)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'alcoholFree', label: 'Alcohol Free' },
                    { key: 'fragranceFree', label: 'Fragrance Free' },
                    { key: 'parabenFree', label: 'Paraben Free' },
                    { key: 'sulfateFree', label: 'Sulfate Free' },
                    { key: 'siliconeFree', label: 'Silicone Free' },
                    { key: 'fungalAcneFree', label: 'Fungal Acne Safe' }
                  ].map(trait => (
                    <div key={trait.key} className="flex items-center space-x-2">
                      {product[trait.key] ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                      )}
                      <span className={`text-sm ${
                        product[trait.key] 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {trait.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleFavoriteClick}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg border transition-colors ${
                    isFavorite
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  <span>{isFavorite ? 'Favorited' : 'Add to Favorites'}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center space-x-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>

                {product.productUrl && (
                  <a
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>View on Store</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="py-8">
            {activeTab === 'overview' && (
              <div className="prose dark:prose-invert max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Product Description
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {product.description || 'No description available for this product.'}
                </p>

                {product.bpomNumber && (
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Regulatory Information
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      BPOM Number: {product.bpomNumber}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ingredients' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Full Ingredients List
                </h3>
                {product.ingredients && product.ingredients.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {product.ingredients.map((ingredient, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm"
                        >
                          {ingredient}
                        </span>
                      ))}
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-blue-800 dark:text-blue-200 text-sm">
                            Ingredients are listed in descending order of concentration. Click on any ingredient to learn more about its benefits and uses.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    Ingredients list not available for this product.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'usage' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  How to Use
                </h3>
                {product.howToUse ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {product.howToUse}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    Usage instructions not available for this product.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'match' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Skin Compatibility
                </h3>
                
                {product.suitableForSkinTypes && product.suitableForSkinTypes.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Suitable for Skin Types:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {product.suitableForSkinTypes.map((skinType, index) => (
                        <span
                          key={index}
                          className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium"
                        >
                          {skinType.charAt(0).toUpperCase() + skinType.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {product.addressesConcerns && product.addressesConcerns.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Addresses Concerns:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {product.addressesConcerns.map((concern, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium"
                        >
                          {concern.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!isAuthenticated && !product.matchScore && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                          <Link to="/skin-quiz" className="font-medium underline">
                            Take our skin quiz
                          </Link>{' '}
                          to see how well this product matches your skin type and concerns.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Similar Products */}
          {similarProducts && similarProducts.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
                Similar Products
              </h2>
              
              {similarLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <CardLoadingSkeleton key={index} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {similarProducts.map((similarProduct) => (
                    <ProductCard
                      key={similarProduct.id}
                      product={similarProduct}
                      showMatchScore={!!product.matchScore}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage;