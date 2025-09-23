import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiEndpoints, apiUtils } from '../utils/api';
import { Crown, AlertTriangle, Check, X, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const SubscriptionBanner = ({ className = '' }) => {
  const { tenant, isAdmin, refreshAuth } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (!tenant) return null;

  const isPro = tenant.plan === 'pro';
  const isNearLimit = tenant.usage?.currentNoteCount >= (tenant.noteLimit - 1);
  const isAtLimit = !tenant.canCreateNotes;

  const handleUpgrade = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can upgrade the subscription');
      return;
    }

    setIsUpgrading(true);
    try {
      await apiEndpoints.tenants.upgrade(tenant.slug);
      toast.success('Successfully upgraded to Pro plan!');
      setShowUpgradeModal(false);
      await refreshAuth(); // Refresh user/tenant data
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      toast.error(errorInfo.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  // Don't show banner for Pro users unless they're an admin
  if (isPro && !isAdmin) return null;

  // Show different banners based on status
  if (isPro) {
    return (
      <div className={`bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Crown className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-purple-900">Pro Plan Active</h3>
              <p className="text-sm text-purple-700">
                Unlimited notes • Advanced features • Priority support
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-purple-900">
              {tenant.usage?.currentNoteCount || 0} notes created
            </div>
            <div className="text-xs text-purple-600">Unlimited</div>
          </div>
        </div>
      </div>
    );
  }

  // Free plan banners
  if (isAtLimit) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900">Note Limit Reached</h3>
              <p className="text-sm text-red-700 mt-1">
                You've used all {tenant.noteLimit} notes in your free plan. 
                Upgrade to Pro for unlimited notes and advanced features.
              </p>
              <div className="mt-2 flex items-center space-x-4">
                <div className="text-xs text-red-600">
                  {tenant.usage?.currentNoteCount || 0} / {tenant.noteLimit} notes used
                </div>
                <div className="w-32 bg-red-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Crown className="h-4 w-4 mr-1" />
              Upgrade Now
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isNearLimit) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-900">Almost at your limit</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You're using {tenant.usage?.currentNoteCount || 0} of {tenant.noteLimit} notes. 
                Consider upgrading to Pro for unlimited notes.
              </p>
              <div className="mt-2 flex items-center space-x-4">
                <div className="text-xs text-yellow-600">
                  {tenant.remainingNotes || 0} notes remaining
                </div>
                <div className="w-32 bg-yellow-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full" 
                    style={{ 
                      width: `${((tenant.usage?.currentNoteCount || 0) / tenant.noteLimit) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="ml-4 inline-flex items-center px-3 py-2 border border-yellow-300 text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <Crown className="h-4 w-4 mr-1" />
              Upgrade
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default free plan banner
  const bannerContent = (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">Free Plan</h3>
            <p className="text-sm text-blue-700">
              {tenant.usage?.currentNoteCount || 0} of {tenant.noteLimit} notes used
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-32 bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ 
                width: `${((tenant.usage?.currentNoteCount || 0) / tenant.noteLimit) * 100}%` 
              }}
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Crown className="h-4 w-4 mr-1" />
              Upgrade
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {bannerContent}
      
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upgrade to Pro</h3>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center mb-2">
                    <Crown className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="font-medium text-purple-900">Pro Plan Benefits</span>
                  </div>
                  <ul className="space-y-2 text-sm text-purple-700">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Unlimited notes
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Advanced editing features
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Up to 100 team members
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Priority support
                    </li>
                  </ul>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">$9</div>
                  <div className="text-sm text-gray-500">per month</div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpgrading ? (
                    <div className="flex items-center justify-center">
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                      Upgrading...
                    </div>
                  ) : (
                    'Upgrade Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubscriptionBanner;
