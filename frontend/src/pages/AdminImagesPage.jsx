import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import Button from '../components/Button';
import {
  listImages,
  createImage,
  updateImage,
  deleteImage,
  uploadImageFile,
} from '../services/adminService';

const PLATE_TYPES = [
  'demonstration',
  'transformation',
  'vanishing',
  'hidden_digit',
  'diagnostic',
  'classification_tracing',
];

const EMPTY_FORM = {
  plateId: '',
  plateNumber: '',
  plateType: 'transformation',
  category: 'red_green',
  imageUrl: '',
  imageSource: '',
  imageSourceUrl: '',
  imageLicense: '',
  imageVerified: false,
  normalVisionResponse: '',
  redGreenDeficientResponse: '',
  totalColorBlindResponse: '',
  protanResponse: '',
  deutanResponse: '',
  notes: '',
  purpose: '',
  active: false,
};

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
      setError('Could not load plates.');
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
      plateId: img.plateId || '',
      plateNumber: img.plateNumber ?? '',
      plateType: img.plateType || 'transformation',
      category: img.category || 'red_green',
      imageUrl: img.imageUrl || '',
      imageSource: img.imageSource || '',
      imageSourceUrl: img.imageSourceUrl || '',
      imageLicense: img.imageLicense || '',
      imageVerified: !!img.imageVerified,
      normalVisionResponse: img.normalVisionResponse || '',
      redGreenDeficientResponse: img.redGreenDeficientResponse || '',
      totalColorBlindResponse: img.totalColorBlindResponse || '',
      protanResponse: img.protanResponse || '',
      deutanResponse: img.deutanResponse || '',
      notes: img.notes || '',
      purpose: img.purpose || '',
      active: !!img.active,
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
      // A freshly uploaded file is NOT automatically "verified" -- an admin
      // must separately confirm licensing/provenance before checking that box.
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
      const payload = {
        ...form,
        plateNumber: form.plateNumber === '' ? undefined : Number(form.plateNumber),
      };
      if (editingId) {
        await updateImage(editingId, payload);
      } else {
        await createImage(payload);
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
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not toggle status. A plate needs a verified image before it can be activated.'
      );
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Ishihara Dataset Management</h1>
          <p className="text-sm text-slate-500">
            A plate can only be activated once it has a verified, properly licensed image. See
            DATASET_LICENSE.md.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add Plate
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search by plate ID, category, or source..."
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
                <th className="px-4 py-3">Plate #</th>
                <th className="px-4 py-3">Plate ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Normal / RG / Protan / Deutan</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Verified</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img) => (
                <tr key={img._id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-slate-100 text-[10px] text-slate-400">
                      {img.imageUrl ? (
                        <img src={img.imageUrl} alt={img.plateId} className="h-full w-full object-cover" />
                      ) : (
                        'no image'
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">{img.plateNumber}</td>
                  <td className="px-4 py-2">{img.plateId}</td>
                  <td className="px-4 py-2">{img.plateType}</td>
                  <td className="px-4 py-2">{img.category}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {[img.normalVisionResponse, img.redGreenDeficientResponse, img.protanResponse, img.deutanResponse]
                      .map((v) => v ?? '—')
                      .join(' / ')}
                  </td>
                  <td className="px-4 py-2 max-w-[160px] truncate text-xs text-slate-500" title={img.imageSource}>
                    {img.imageSource || '—'}
                  </td>
                  <td className="px-4 py-2">
                    {img.imageVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <ShieldCheck size={14} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                        <ShieldAlert size={14} /> Unverified
                      </span>
                    )}
                  </td>
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
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No plates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <Card className="w-full max-w-lg my-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingId ? 'Edit Plate' : 'Add Plate'}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Plate ID</label>
                  <input
                    required
                    value={form.plateId}
                    onChange={(e) => setForm({ ...form, plateId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Plate Number</label>
                  <input
                    required
                    type="number"
                    value={form.plateNumber}
                    onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Plate Type</label>
                  <select
                    value={form.plateType}
                    onChange={(e) => setForm({ ...form, plateType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                  >
                    {PLATE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                  >
                    {(categories.length
                      ? categories
                      : [{ key: 'red_green', label: 'Red-Green Deficiency Indicator' }]
                    ).map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="pt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Verified response metadata (leave blank if unknown -- do not guess)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Normal Vision Response</label>
                  <input
                    value={form.normalVisionResponse}
                    onChange={(e) => setForm({ ...form, normalVisionResponse: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Red-Green Deficient Response</label>
                  <input
                    value={form.redGreenDeficientResponse}
                    onChange={(e) => setForm({ ...form, redGreenDeficientResponse: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Protan Response</label>
                  <input
                    value={form.protanResponse}
                    onChange={(e) => setForm({ ...form, protanResponse: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Deutan Response</label>
                  <input
                    value={form.deutanResponse}
                    onChange={(e) => setForm({ ...form, deutanResponse: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                  />
                </div>
              </div>

              <p className="pt-1 text-xs font-medium uppercase tracking-wide text-slate-400">Provenance</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Source</label>
                <input
                  value={form.imageSource}
                  onChange={(e) => setForm({ ...form, imageSource: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Source URL</label>
                <input
                  value={form.imageSourceUrl}
                  onChange={(e) => setForm({ ...form, imageSourceUrl: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">License / Permission Notes</label>
                <textarea
                  value={form.imageLicense}
                  onChange={(e) => setForm({ ...form, imageLicense: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.imageVerified}
                  onChange={(e) => setForm({ ...form, imageVerified: e.target.checked })}
                />
                Image verified (rights confirmed, image confirmed authentic)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active (can be shown in live tests -- requires a verified image)
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingId ? 'Save Changes' : 'Add Plate'}</Button>
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
              Delete plate <strong>{deleteTarget.plateId}</strong>? This cannot be undone.
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