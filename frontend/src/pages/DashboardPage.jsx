import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotes } from '../contexts/NotesContext';
import { 
  FileText, 
  Users, 
  TrendingUp, 
  PlusCircle,
  Clock,
  Star,
  Crown,
  Shield,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SubscriptionBanner from '../components/SubscriptionBanner';

const DashboardPage = () => {
  const { tenant, userFullName, isAdmin } = useAuth();
  const { notes, stats, fetchNotes, fetchStats, isLoading } = useNotes();
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!dataLoaded) {
      fetchNotes({ limit: 5 }); // Get recent notes
      fetchStats();
      setDataLoaded(true);
    }
  }, [fetchNotes, fetchStats, dataLoaded]);

  const recentNotes = notes.slice(0, 5);

  // Base stat cards for all users
  const baseStatCards = [
    {
      name: 'Total Notes',
      value: stats.totalNotes || 0,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Words',
      value: stats.totalWords || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
  ];

  // Additional stat cards for admins
  const adminStatCards = [
    {
      name: 'Notes Limit',
      value: tenant?.hasUnlimitedNotes ? 'Unlimited' : `${tenant?.noteLimit || 3}`,
      icon: Star,
      color: 'bg-purple-500',
    },
    {
      name: 'Plan',
      value: tenant?.plan === 'free' ? 'Free' : 'Pro',
      icon: tenant?.plan === 'pro' ? Crown : Shield,
      color: tenant?.plan === 'pro' ? 'bg-purple-500' : 'bg-indigo-500',
    },
  ];

  // Combine stat cards based on role
  const statCards = isAdmin ? [...baseStatCards, ...adminStatCards] : baseStatCards;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Banner */}
      <SubscriptionBanner />
      
      {/* Welcome Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {userFullName}!
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Here's what's happening with your notes today.
              </p>
            </div>
            <Link
              to="/notes/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              New Note
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${stat.color} rounded-md p-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Notes */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Notes
            </h3>
            <Link
              to="/notes"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View all
            </Link>
          </div>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {recentNotes.length > 0 ? (
            <div className="space-y-4">
              {recentNotes.map((note) => (
                <div key={note._id} className="flex items-start space-x-3 p-4 hover:bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/notes/${note._id}`}
                      className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {note.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {note.excerpt || 'No content preview available'}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-400 space-x-4">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </div>
                      {note.category && (
                        <div className="px-2 py-1 bg-gray-100 rounded-full">
                          {note.category}
                        </div>
                      )}
                      <div>
                        {note.metadata?.wordCount || 0} words
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notes yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first note.
              </p>
              <div className="mt-6">
                <Link
                  to="/notes/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Note
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Information */}
      {tenant?.plan === 'free' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Star className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Free Plan Limits
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You're using {stats.totalNotes || 0} of {tenant?.noteLimit || 3} notes available in your free plan.
                  {tenant?.remainingNotes === 0 && (
                    <span className="font-medium"> You've reached your limit!</span>
                  )}
                </p>
                <p className="mt-1">
                  <Link
                    to="/settings"
                    className="font-medium underline hover:text-yellow-600"
                  >
                    Upgrade to Pro
                  </Link>
                  {' '}for unlimited notes and advanced features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
