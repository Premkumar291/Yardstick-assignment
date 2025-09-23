import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotes } from '../contexts/NotesContext';
import { Save, ArrowLeft, Eye, Settings } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const NoteEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    currentNote, 
    getNoteById, 
    createNote, 
    updateNote, 
    setCurrentNote,
    isLoading 
  } = useNotes();
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: [],
    status: 'draft'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const isEditing = !!id;

  useEffect(() => {
    if (isEditing && id) {
      getNoteById(id);
    } else {
      setCurrentNote(null);
      setFormData({
        title: '',
        content: '',
        category: '',
        tags: [],
        status: 'draft'
      });
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (currentNote) {
      setFormData({
        title: currentNote.title || '',
        content: currentNote.content || '',
        category: currentNote.category || '',
        tags: currentNote.tags || [],
        status: currentNote.status || 'draft'
      });
    }
  }, [currentNote]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      return;
    }

    setIsSaving(true);
    
    try {
      let result;
      if (isEditing) {
        result = await updateNote(id, formData);
      } else {
        result = await createNote(formData);
      }
      
      if (result.success) {
        if (!isEditing) {
          navigate(`/notes/${result.data._id}`);
        }
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/notes');
  };

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Note' : 'New Note'}
            </h1>
            <p className="text-sm text-gray-500">
              {isEditing ? 'Make changes to your note' : 'Create a new note'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.title.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <LoadingSpinner size="small" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {!showPreview ? (
          <div className="divide-y divide-gray-200">
            {/* Title and Metadata */}
            <div className="p-6 space-y-4">
              <div>
                <input
                  type="text"
                  name="title"
                  placeholder="Note title..."
                  className="w-full text-2xl font-bold border-none focus:outline-none focus:ring-0 placeholder-gray-400"
                  value={formData.title}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    name="category"
                    placeholder="Category"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.category}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <form onSubmit={handleAddTag} className="flex">
                    <input
                      type="text"
                      placeholder="Add tag"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>
              
              {/* Tags Display */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* Content Editor */}
            <div className="p-6">
              <textarea
                name="content"
                placeholder="Start writing your note..."
                className="w-full h-96 border-none resize-none focus:outline-none focus:ring-0 placeholder-gray-400"
                value={formData.content}
                onChange={handleChange}
              />
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div className="p-6">
            <div className="prose max-w-none">
              <h1>{formData.title || 'Untitled Note'}</h1>
              <div className="mb-4 flex flex-wrap gap-2 text-sm text-gray-600">
                {formData.category && (
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    Category: {formData.category}
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-100 rounded">
                  Status: {formData.status}
                </span>
              </div>
              {formData.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="whitespace-pre-wrap">
                {formData.content || 'No content yet...'}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Auto-save indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-md shadow-lg">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="small" />
            <span>Saving...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteEditorPage;
