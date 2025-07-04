import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Users, Award, Shield, ArrowRight } from 'lucide-react';
import { useQuery } from 'react-query';
import { apiMethods } from '../services/api';
import ProductCard from '../components/Products/ProductCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const HomePage = () => {
  const { data: trendingProducts, isLoading } = useQuery(
    'trending-products',
    () => apiMethods.recommendations.getTrending({ limit: 8 }),
    {
      select: (response) => response.data.data.trending
    }
  );

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Analysis",
      description: "Advanced ontology-based recommendation system"
    },
    {
      icon: Users,
      title: "Personalized Match",
      description: "Tailored recommendations for your unique skin"
    },
    {
      icon: Award,
      title: "Expert Curated",
      description: "Products selected by skincare professionals"
    },
    {
      icon: Shield,
      title: "Safe & Trusted",
      description: "Verified ingredients and safety information"
    }
  ];

  return (
    <>
      <Helmet>
        <title>MatchCare - Find Your Perfect Skincare Match</title>
        <meta name="description" content="Discover personalized skincare recommendations with our AI-powered ontology system. Take the skin quiz and find products perfect for your skin type." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Find Your Perfect
              <span className="gradient-text block">Skincare Match</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Discover personalized skincare recommendations powered by advanced ontology and AI. 
              Take our comprehensive skin analysis and get products tailored just for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/skin-quiz"
                className="btn btn-primary btn-lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Skin Analysis
              </Link>
              <Link
                to="/products"
                className="btn btn-secondary btn-lg"
              >
                Browse Products
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose MatchCare?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Experience the future of personalized skincare
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Trending Products
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Discover what's popular in skincare right now
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner size="lg" text="Loading trending products..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {trendingProducts?.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/products"
              className="btn btn-primary"
            >
              View All Products
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-800">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Skincare Routine?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users who have found their perfect skincare match with MatchCare
          </p>
          <Link
            to="/skin-quiz"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
          >
            <Sparkles className="w-6 h-6 mr-2" />
            Start Your Journey
          </Link>
        </div>
      </section>
    </>
  );
};

export default HomePage;
