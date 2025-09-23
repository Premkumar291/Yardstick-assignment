import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings, 
  Users, 
  CreditCard, 
  Shield, 
  Building,
  Crown,
  Check
} from 'lucide-react';

const SettingsPage = () => {
  const { tenant, user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'users', name: 'Users', icon: Users, adminOnly: true },
    { id: 'billing', name: 'Billing', icon: CreditCard, adminOnly: true },
    { id: 'security', name: 'Security', icon: Shield, adminOnly: true },
  ];

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Organization Information</h3>
              <p className="text-sm text-gray-500">
                Basic information about your organization
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  value={tenant?.name || ''}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Slug
                </label>
                <input
                  type="text"
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  value={tenant?.slug || ''}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your organization's unique identifier
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Current Plan</h4>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${tenant?.plan === 'pro' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      {tenant?.plan === 'pro' ? (
                        <Crown className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Building className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div className="ml-3">
                      <h5 className="text-sm font-medium text-gray-900">
                        {tenant?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                      </h5>
                      <p className="text-xs text-gray-500">
                        {tenant?.plan === 'pro' 
                          ? 'Unlimited notes and advanced features'
                          : `${tenant?.noteLimit || 3} notes limit`
                        }
                      </p>
                    </div>
                  </div>
                  {tenant?.plan === 'free' && isAdmin && (
                    <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
                      Upgrade to Pro
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && isAdmin && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
                <p className="text-sm text-gray-500">
                  Manage users in your organization
                </p>
              </div>
              <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
                Invite User
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users to display</h3>
              <p className="mt-1 text-sm text-gray-500">
                User management will be implemented in the next phase
              </p>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && isAdmin && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Billing & Subscription</h3>
              <p className="text-sm text-gray-500">
                Manage your subscription and billing information
              </p>
            </div>

            {/* Plan Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free Plan */}
              <div className={`border-2 rounded-lg p-6 ${tenant?.plan === 'free' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Free Plan</h4>
                  {tenant?.plan === 'free' && (
                    <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-4">$0<span className="text-lg text-gray-500">/month</span></div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Up to 3 notes
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Basic note editing
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Up to 5 team members
                  </li>
                </ul>
                {tenant?.plan !== 'free' && (
                  <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                    Downgrade
                  </button>
                )}
              </div>

              {/* Pro Plan */}
              <div className={`border-2 rounded-lg p-6 ${tenant?.plan === 'pro' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Pro Plan</h4>
                  {tenant?.plan === 'pro' && (
                    <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-4">$9<span className="text-lg text-gray-500">/month</span></div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Unlimited notes
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Advanced editing features
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Up to 100 team members
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Priority support
                  </li>
                </ul>
                {tenant?.plan !== 'pro' && (
                  <button className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
                    Upgrade to Pro
                  </button>
                )}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Current Usage</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{tenant?.usage?.currentNoteCount || 0}</div>
                  <div className="text-sm text-gray-500">
                    Notes {tenant?.hasUnlimitedNotes ? '' : `/ ${tenant?.noteLimit || 3}`}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{tenant?.usage?.currentUserCount || 0}</div>
                  <div className="text-sm text-gray-500">Team Members</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round((tenant?.usage?.storageUsed || 0) / 1024 / 1024 * 100) / 100}MB
                  </div>
                  <div className="text-sm text-gray-500">Storage Used</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && isAdmin && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
              <p className="text-sm text-gray-500">
                Configure security settings for your organization
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Security features coming soon</h3>
              <p className="mt-1 text-sm text-gray-500">
                Advanced security features will be implemented in the next phase
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
