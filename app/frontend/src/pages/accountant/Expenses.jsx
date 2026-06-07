import { useState, useEffect, useCallback } from 'react';
import { 
  Search, Plus, X, Edit2, Trash2, Save, 
  ChevronDown, Download, Calendar, Building2
} from 'lucide-react';
import { 
  getExpenses, createExpense, updateExpense, deleteExpense, 
  getExpenseBudget, getExpenseCategories, getFilters
} from '../../services/accountantService';

const categoryColors = {
  consumables: 'bg-blue-100 text-blue-700',
  payroll: 'bg-purple-100 text-purple-700',
  utilities: 'bg-amber-100 text-amber-700',
  rent: 'bg-green-100 text-green-700',
  marketing: 'bg-pink-100 text-pink-700',
  maintenance: 'bg-gray-100 text-gray-700',
  software: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-500',
};

const categoryLabels = {
  consumables: 'Consumables',
  payroll: 'Payroll',
  utilities: 'Utilities',
  rent: 'Rent',
  marketing: 'Marketing',
  maintenance: 'Maintenance',
  software: 'Software',
  other: 'Other',
};

function ExpenseModal({ expense, onClose, onSave, categories, branches, saving }) {
  const [form, setForm] = useState({
    category: expense?.category || 'consumables',
    amount: expense?.amount || '',
    description: expense?.description || '',
    expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
    supplier: expense?.supplier || '',
    branch_id: expense?.branch_id || 'all',
  });

  const handleSubmit = () => {
    if (!form.amount || !form.description) return;
    const submitData = {
      ...form,
      amount: parseFloat(form.amount),
      branch_id: form.branch_id === 'all' ? null : form.branch_id,
    };
    onSave(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (ETB)</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Expense description..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Expense Date</label>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Supplier (Optional)</label>
            <input
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              placeholder="Supplier name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch</label>
            <select
              value={form.branch_id}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (expense ? 'Update' : 'Add Expense')}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ expense, onClose, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
        <h3 className="text-base font-bold text-gray-900 mb-2">Delete Expense</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete expense for <span className="font-semibold">{expense?.description}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountantExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadFilters = useCallback(async () => {
    try {
      const [cats, filters] = await Promise.all([
        getExpenseCategories(),
        getFilters()
      ]);
      setCategories(cats);
      setBranches(filters.branches || []);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  }, []);

  const loadExpenses = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        per_page: 15,
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(branchFilter !== 'all' && { branch_id: branchFilter }),
        ...(fromDate && { from_date: fromDate }),
        ...(toDate && { to_date: toDate }),
        ...(search && { search }),
      };
      const response = await getExpenses(params);
      setExpenses(response.data || []);
      setPagination({
        current_page: response.meta?.current_page || 1,
        last_page: response.meta?.last_page || 1,
        total: response.meta?.total || 0,
      });
    } catch (error) {
      console.error('Failed to load expenses:', error);
      showToast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, branchFilter, fromDate, toDate, search]);

  const loadBudget = useCallback(async () => {
    try {
      const data = await getExpenseBudget();
      setBudget(data);
    } catch (error) {
      console.error('Failed to load budget:', error);
    }
  }, []);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadExpenses();
    loadBudget();
  }, [loadExpenses, loadBudget]);

  const handleSearch = () => {
    loadExpenses(1);
  };

  const handleCreateExpense = async (data) => {
    setSaving(true);
    try {
      await createExpense(data);
      showToast('Expense added successfully');
      setShowModal(false);
      loadExpenses(pagination.current_page);
      loadBudget();
    } catch (error) {
      showToast('Failed to add expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExpense = async (data) => {
    setSaving(true);
    try {
      await updateExpense(editingExpense.id, data);
      showToast('Expense updated successfully');
      setShowModal(false);
      setEditingExpense(null);
      loadExpenses(pagination.current_page);
      loadBudget();
    } catch (error) {
      showToast('Failed to update expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    setDeleting(true);
    try {
      await deleteExpense(deletingExpense.id);
      showToast('Expense deleted successfully');
      setDeletingExpense(null);
      loadExpenses(pagination.current_page);
      loadBudget();
    } catch (error) {
      showToast('Failed to delete expense', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setCategoryFilter('all');
    setBranchFilter('all');
    setFromDate('');
    setToDate('');
    setSearch('');
  };

  const formatCurrency = (amount) => {
    return `ETB ${amount?.toLocaleString() || 0}`;
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          onClose={() => { setShowModal(false); setEditingExpense(null); }}
          onSave={editingExpense ? handleUpdateExpense : handleCreateExpense}
          categories={categories}
          branches={branches}
          saving={saving}
        />
      )}

      {deletingExpense && (
        <DeleteConfirmModal
          expense={deletingExpense}
          onClose={() => setDeletingExpense(null)}
          onConfirm={handleDeleteExpense}
          deleting={deleting}
        />
      )}

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
            Expense Management
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track operational costs, budget vs actual, and expense trends.
          </p>
        </div>
        <button
          onClick={() => { setEditingExpense(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-blue-900"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Budget vs Actual Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {budget.slice(0, 4).map((cat) => (
          <div key={cat.category_key} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[cat.category_key]}`}>
                {cat.category}
              </span>
              <span className={`text-xs font-semibold ${cat.percent_used >= 100 ? 'text-red-600' : cat.percent_used >= 80 ? 'text-amber-600' : 'text-green-600'}`}>
                {cat.percent_used}%
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(cat.actual)}</p>
            <p className="text-xs text-gray-400">Budget: {formatCurrency(cat.budget)}</p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${cat.percent_used >= 100 ? 'bg-red-500' : cat.percent_used >= 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(cat.percent_used, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row gap-3 flex-wrap">
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white outline-none"
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          placeholder="From"
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          placeholder="To"
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
        />
        <button onClick={clearFilters} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">
          Clear
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-bold tracking-widest text-gray-400">DATE</th>
                <th className="px-6 py-3 text-left text-xs font-bold tracking-widest text-gray-400">CATEGORY</th>
                <th className="px-6 py-3 text-left text-xs font-bold tracking-widest text-gray-400">DESCRIPTION</th>
                <th className="px-6 py-3 text-left text-xs font-bold tracking-widest text-gray-400">BRANCH</th>
                <th className="px-6 py-3 text-right text-xs font-bold tracking-widest text-gray-400">AMOUNT</th>
                <th className="px-6 py-3 text-center text-xs font-bold tracking-widest text-gray-400">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No expenses found.</td></tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">{expense.expense_date}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[expense.category]}`}>
                        {categoryLabels[expense.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{expense.description}</p>
                      {expense.supplier && <p className="text-xs text-gray-400">{expense.supplier}</p>}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{expense.branch_name}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(expense.amount)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setEditingExpense(expense); setShowModal(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingExpense(expense)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">Showing {expenses.length} of {pagination.total} records</p>
            <div className="flex gap-2">
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => loadExpenses(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                    pagination.current_page === page ? 'bg-[#1F4E79] text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}