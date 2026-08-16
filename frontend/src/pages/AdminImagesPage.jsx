import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { Card } from '../components/Card';
import Button from '../components/Button';
import {
  listImages,
  createImage,
  updateImage,
  deleteImage,
  uploadImageFile,
} from '../services/adminService';

const EMPTY_FORM = { imageId: '', imageUrl: '', correctAnswer: '', category: 'normal', difficulty: 'medium', active: true };

export default function AdminImagesPage() {
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await listImages(search ? { search } : {});
      setImages(data.images);
      setCategories(data.availableCategories);
    } catch {
      setError('Could not load images.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(img) {
    setForm({
      imageId: img.imageId,
      imageUrl: img.imageUrl,
      correctAnswer: img.correctAnswer,
      category: img.category,
      difficulty: img.difficulty,
      active: img.active,
    });
    setEditingId(img._id);
    setShowForm(true);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await updateImage(editingId, form);
      } else {
        await createImage(form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteImage(deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch {
      setError('Delete failed.');
    }
  }

  async function toggleActive(img) {
    try {
      await updateImage(img._id, { active: !img.active });
      load();
    } catch {
      setError('Could not toggle status.');
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Ishihara Image Management</h1>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add Image
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search by image ID or category..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-ring"
          />
        </div>
        <Button variant="outline" onClick={load}>
          Search
        </Button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card className="overflow-x-auto p-0">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">Image ID</th>
                <th className="px-4 py-3">Answer</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img) => (
                <tr key={img._id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <div className="h-10 w-10 overflow-hidden rounded bg-slate-100">
                      <img src={img.imageUrl} alt={img.imageId} className="h-full w-full object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-2">{img.imageId}</td>
                  <td className="px-4 py-2">{img.correctAnswer}</td>
                  <td className="px-4 py-2">{img.category}</td>
                  <td className="px-4 py-2 capitalize">{img.difficulty}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(img)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        img.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {img.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="flex gap-2 px-4 py-2">
                    <Button variant="outline" className="!px-2 !py-1" onClick={() => openEdit(img)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="danger" className="!px-2 !py-1" onClick={() => setDeleteTarget(img)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
              {images.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No images found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingId ? 'Edit Image' : 'Add Image'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Image File</label>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="text-sm" />
                {uploading && <p className="mt-1 text-xs text-slate-400">Uploading...</p>}
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="preview" className="mt-2 h-16 w-16 rounded object-cover" />
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Image ID</label>
                <input
                  required
                  value={form.imageId}
                  onChange={(e) => setForm({ ...form, imageId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Correct Answer</label>
                <input
                  required
                  value={form.correctAnswer}
                  onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                >
                  {(categories.length ? categories : [{ key: 'normal', label: 'Normal' }]).map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active (visible in tests)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingId ? 'Save Changes' : 'Add Image'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm text-center">
            <p className="mb-4 text-slate-700">
              Delete image <strong>{deleteTarget.imageId}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
