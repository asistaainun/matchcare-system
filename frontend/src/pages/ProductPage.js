import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Filter, Grid, List, SlidersHorizontal, X } from 'lucide-react';
import { useQuery } from 'react-query';

import { useAuth } from '../contexts/AuthContext';
import { useGuest } from '../contexts/GuestContext';
import { apiMethods } from '../services/api';

import ProductCard from '../components/Products/ProductCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    skinType: searchParams.get('skinType') || '',
    concerns: searchParams.get('concerns') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'productName',
    sortOrder: searchParams.get('sortOrder') || 'ASC'
  });
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);

  const { isAuthenticated, user } = useAuth();
  const { sessionId, profile: guestProfile } = useGuest();

  // Fetch products with filters
  const {
    data: productsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['products', filters, currentPage, sessionId, user?.id],
    () => apiMethods.products.getAll({
      ...filters,
      page: currentPage,
      limit: 20,
      userId: user?.id,
      guestSessionId: sessionId
    }),
    {
      keepPreviousData: true,
      select: (response) => response.data.data
    }
  );

  // Fetch filter options
  const { data: categoriesData } = useQuery(
    'product-categories',
    () => apiMethods.products.getCategories(),
    {
      select: (response) => response.data.data
    }
  );

  const { data: brandsData } = useQuery(
    'product-brands',
    () => apiMethods.products.getBrands(),
    {
      select: (response) => response.data.data
    }
  );

  // Update URL when filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
    });
    if (currentPage > 1) newParams.set('page', currentPage.toString());
    
    setSearchParams(newParams);
  }, [filters, currentPage, setSearchParams]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      brand: '',
      skinType: '',
      concerns: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'productName',
      sortOrder: 'ASC'
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const skinTypes = [
    { value: 'normal', label: 'Normal' },
    { value: 'dry', label: 'Dry' },
    { value: 'oily', label: 'Oily' },
    { value: 'combination', label: 'Combination' },
    { value: 'sensitive', label: 'Sensitive' }
  ];

  const skinConcerns = [
    { value: 'acne', label: 'Acne' },
    { value: 'wrinkles', label: 'Wrinkles' },
    { value: 'fine_lines', label: 'Fine Lines' },
    { value: 'dark_spots', label: 'Dark Spots' },
    { value: 'dryness', label: 'Dryness' },
    { value: 'oiliness', label: 'Oiliness' },
    { value: 'sensitivity', label: 'Sensitivity' },
    { value: 'pores', label: 'Large Pores' },
    { value: 'dullness', label: 'Dullness' },
    { value: 'redness', label: 'Redness' }
  ];

  const sortOptions = [
    { value: 'productName', label: 'Name' },
    { value: 'rating', label: 'Rating' },
    { value: 'regularPrice', label: 'Price' },
    { value: 'viewCount', label: 'Popularity' }
  ];

  // Get user's skin profile for personalized recommendations
  const userProfile = isAuthenticated ? user?.profile : guestProfile;
  const showMatchScores = !!(userProfile?.skinType);

  return (
    <>
      <Helmet>
        <title>Products - MatchCare</title>
        <meta 
          name="description" 
          content="Browse our extensive collection of skincare products. Find products that match your skin type and concerns." 
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Skincare Products
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {productsData?.totalProducts 
                    ? `${productsData.totalProducts} products found`
                    : 'Discover your perfect skincare match'
                  }
                </p>
              </div>

              <div className="flex items-center space-x-4">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filters</span>
                </button>
              </div>
            </div>

            {/* User Profile Info */}
            {userProfile?.skinType && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Showing personalized recommendations for{' '}
                  <span className="font-semibold">{userProfile.skinType} skin</span>
                  {userProfile.skinConcerns && userProfile.skinConcerns.length > 0 && (
                    <>
                      {' '}with concerns: {userProfile.skinConcerns.slice(0, 2).join(', ')}
                      {userProfile.skinConcerns.length > 2 && ` +${userProfile.skinConcerns.length - 2} more`}
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <div className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Filters
                  </h3>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Categories</option>
                      {categoriesData?.categories?.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Brand Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Brand
                    </label>
                    <select
                      value={filters.brand}
                      onChange={(e) => handleFilterChange('brand', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Brands</option>
                      {brandsData?.slice(0, 20).map(brand => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Skin Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Skin Type
                    </label>
                    <select
                      value={filters.skinType}
                      onChange={(e) => handleFilterChange('skinType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Skin Types</option>
                      {skinTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Skin Concerns Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Skin Concerns
                    </label>
                    <select
                      value={filters.concerns}
                      onChange={(e) => handleFilterChange('concerns', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Concerns</option>
                      {skinConcerns.map(concern => (
                        <option key={concern.value} value={concern.value}>
                          {concern.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price Range (IDR)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sort By
                    </label>
                    <div className="space-y-2">
                      <select
                        value={filters.sortBy}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {sortOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filters.sortOrder}
                        onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="ASC">Ascending</option>
                        <option value="DESC">Descending</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1">
              {/* Mobile filter toggle */}
              {showFilters && (
                <div className="lg:hidden mb-6">
                  <button
                    onClick={() => setShowFilters(false)}
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-400"
                  >
                    <X className="w-4 h-4" />
                    <span>Hide Filters</span>
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" text="Loading products..." />
                </div>
              ) : error ? (
                <ErrorMessage 
                  message="Failed to load products" 
                  onRetry={refetch}
                />
              ) : !productsData?.products?.length ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 dark:text-gray-500 mb-4">
                    <Filter className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No products found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Try adjusting your filters or search terms
                  </p>
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Products Grid */}
                  <div className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                      : 'space-y-4'
                  }>
                    {productsData.products.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        showMatchScore={showMatchScores}
                        className={viewMode === 'list' ? 'flex' : ''}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {productsData.pagination && productsData.pagination.totalPages > 1 && (
                    <div className="mt-8 flex justify-center">
                      <div className="flex items-center space-x-2">
                        {/* Previous Button */}
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={!productsData.pagination.hasPrevPage}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: Math.min(5, productsData.pagination.totalPages) }, (_, i) => {
                          const page = Math.max(1, currentPage - 2) + i;
                          if (page > productsData.pagination.totalPages) return null;
                          
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-2 border rounded-md text-sm font-medium ${
                                page === currentPage
                                  ? 'border-blue-500 bg-blue-600 text-white'
                                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}

                        {/* Next Button */}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={!productsData.pagination.hasNextPage}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductsPage;