import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotes } from '../contexts/NotesContext';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  FileText, 
  Clock,
  Tag,
  MoreVertical,
  AlertTriangle,
  Crown
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SubscriptionBanner from '../components/SubscriptionBanner';

const NotesPage = () => {
  const { tenant, isAdmin } = useAuth();
  const {
    notes,
    isLoading,
    fetchNotes,
    filters,
    setFilters,
    searchNotes,
    searchResults,
    isSearching,
    clearSearchResults
  } = useNotes();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await searchNotes(searchQuery);
    } else {
      clearSearchResults();
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ [key]: value });
    fetchNotes();
  };

  const displayNotes = searchResults.length > 0 ? searchResults : notes;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Check if user can create notes
  const canCreateNotes = tenant?.canCreateNotes;

  return (
    <div className="space-y-6">
      {/* Subscription Banner */}
      <SubscriptionBanner />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
          <p className="text-sm text-gray-500">
            Manage and organize your notes
          </p>
        </div>
        {canCreateNotes ? (
          <Link
            to="/notes/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New Note
          </Link>
        ) : (
          <div className="relative">
            <button
              disabled
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-400 bg-gray-100 cursor-not-allowed"
              title={`Note limit reached (${tenant?.usage?.currentNoteCount || 0}/${tenant?.noteLimit || 3})`}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Limit Reached
            </button>
            {isAdmin && (
              <div className="absolute top-0 right-0 -mt-2 -mr-2">
                <Crown className="h-4 w-4 text-yellow-500" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <form onSubmit={handleSearch} className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSearching ? <LoadingSpinner size="small" /> : 'Search'}
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Filter className="h-4 w-4" />
          </button>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="updatedAt">Last Modified</option>
                  <option value="createdAt">Date Created</option>
                  <option value="title">Title</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className="bg-white shadow rounded-lg">
        {displayNotes.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {displayNotes.map((note) => (
              <div key={note._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/notes/${note._id}`}
                      className="text-lg font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {note.title}
                    </Link>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {note.excerpt || 'No content preview available'}
                    </p>
                    
                    <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </div>
                      <div>
                        {note.metadata?.wordCount || 0} words
                      </div>
                      {note.category && (
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 mr-1" />
                          {note.category}
                        </div>
                      )}
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        note.status === 'published' 
                          ? 'bg-green-100 text-green-800'
                          : note.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {note.status}
                      </div>
                    </div>
                    
                    {note.tags && note.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{note.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex-shrink-0">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery 
                ? 'Try adjusting your search terms or filters'
                : 'Get started by creating your first note.'
              }
            </p>
            {!searchQuery && (
              <div className="mt-6">
                <Link
                  to="/notes/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Note
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesPage;
