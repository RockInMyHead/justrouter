import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Users, Bot, Activity, LogOut, Eye, EyeOff, ArrowLeft,
  Shield, Search, Plus, Edit2, Trash2, Check, X, ToggleLeft, ToggleRight,
  Key, Globe, Server, Cpu, DollarSign, RefreshCw, TrendingUp, MessageSquare,
  Calendar, ExternalLink,
} from 'lucide-react';

function formatCurrency(n) {
  return Number(n || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString('ru-RU');
}

function getToken() {
  return localStorage.getItem('velorix_admin_token');
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm hover:bg-white/[0.06] transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        <div className={'size-9 rounded-xl flex items-center justify-center ' + color}>
          <Icon size={18} />
        </div>
        <span className="text-white/50 text-xs font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      {sub && <div className="text-white/30 text-xs mt-1 font-mono">{sub}</div>}
    </div>
  );
}

function RevenueChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-white/20 text-xs font-mono">
        Нет данных
      </div>
    );
  }
  const maxRevenue = Math.max(...data.map(function(d) { return d.revenue; }), 1);
  return (
    <div className="flex items-end justify-between gap-1 h-40">
      {data.map(function(d, i) {
        var pct = (d.revenue / maxRevenue) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {formatCurrency(d.revenue)} ₽
            </div>
            <div
              className="w-full rounded-t-sm bg-gradient-to-t from-emerald-500/40 to-emerald-400/20 transition-all duration-500"
              style={{ height: Math.max(pct, 1) + '%' }}
            />
            <span className="text-white/20 text-[9px] font-mono truncate max-w-full">
              {(d.label || '').slice(-2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 1: Overview ──
function OverviewTab() {
  var [data, setData] = useState(null);

  useEffect(function() {
    var token = getToken();
    if (!token) return;
    fetch('/api/admin/overview', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(setData).catch(function() {});
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-white/30 text-sm font-mono">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Пользователи" value={formatNumber(data.total_users)} sub={'+' + formatNumber(data.users_today) + ' сегодня'} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Bot} label="Агенты" value={formatNumber(data.total_agents)} sub="Всего создано" color="bg-purple-500/20 text-purple-400" />
        <StatCard icon={MessageSquare} label="Сообщения" value={formatNumber(data.total_messages)} sub={'+' + formatNumber(data.messages_today) + ' сегодня'} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={Cpu} label="Модели" value={formatNumber(data.total_models)} sub="Доступно" color="bg-amber-500/20 text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <span className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-4">Финансы</span>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-xs font-mono">Заработано</span>
              <span className="text-emerald-400 text-sm font-semibold">{formatCurrency(data.total_revenue)} ₽</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-xs font-mono">Пополнения</span>
              <span className="text-blue-400 text-sm font-semibold">{formatCurrency(data.total_topups)} ₽</span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex justify-between items-center">
              <span className="text-white/40 text-xs font-mono">Чистая прибыль</span>
              <span className={'text-sm font-semibold ' + (data.total_revenue - data.total_topups <= 0 ? 'text-emerald-400' : 'text-amber-400')}>
                {formatCurrency(data.total_topups - data.total_revenue)} ₽
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-xs font-mono uppercase tracking-wider">График доходов (14 дней)</span>
          </div>
          <RevenueChart data={data.revenue_chart} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <span className="text-white/50 text-xs font-mono uppercase tracking-wider mb-4 block">Топ модели</span>
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
              <div className="flex-1">Модель</div>
              <div className="w-24 text-right">Запросы</div>
            </div>
            {(data.top_models || []).length === 0 ? (
              <div className="py-8 text-center text-white/20 text-xs font-mono">Нет данных</div>
            ) : (
              data.top_models.map(function(m, i) {
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.02] text-xs font-mono">
                    <div className="flex-1 text-white/80">{m.model_id}</div>
                    <div className="w-24 text-right text-white/60">{formatNumber(m.count)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Users ──
function UsersTab() {
  var [users, setUsers] = useState([]);
  var [total, setTotal] = useState(0);
  var [page, setPage] = useState(1);
  var [search, setSearch] = useState('');
  var [searchInput, setSearchInput] = useState('');
  var [selectedUser, setSelectedUser] = useState(null);
  var [userDetail, setUserDetail] = useState(null);
  var [adjustAmount, setAdjustAmount] = useState('');
  var [adjustReason, setAdjustReason] = useState('Корректировка администратором');
  var limit = 20;

  function fetchUsers() {
    var token = getToken();
    if (!token) return;
    var params = 'page=' + page + '&limit=' + limit;
    if (search) params += '&search=' + encodeURIComponent(search);
    fetch('/api/admin/users?' + params, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(function(d) { setUsers(d.users || []); setTotal(d.total || 0); })
      .catch(function() {});
  }

  useEffect(function() { fetchUsers(); }, [page, search]);

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function totalPages() {
    return Math.ceil(total / limit) || 1;
  }

  function viewUser(u) {
    setSelectedUser(u);
    var token = getToken();
    fetch('/api/admin/users/' + u.id, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(setUserDetail).catch(function() {});
  }

  function adjustBalance() {
    var amt = parseFloat(adjustAmount);
    if (isNaN(amt) || !selectedUser) return;
    var token = getToken();
    fetch('/api/admin/users/' + selectedUser.id + '/balance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ amount: amt, reason: adjustReason }),
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setUserDetail(function(prev) { return prev ? Object.assign({}, prev, { balance: d.balance }) : prev; });
        setAdjustAmount('');
      })
      .catch(function() {});
  }

  if (selectedUser) {
    return (
      <div className="space-y-4">
        <button onClick={function() { setSelectedUser(null); setUserDetail(null); }} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-xs font-mono transition-colors cursor-pointer">
          <ArrowLeft size={14} /> Назад к списку
        </button>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <h3 className="text-white font-semibold text-lg mb-4">{(selectedUser.name || selectedUser.email)}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Email</span>
              <span className="text-white/80 text-sm font-mono">{userDetail ? userDetail.email : '...'}</span>
            </div>
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Баланс</span>
              <span className="text-white text-sm font-mono font-semibold">{userDetail ? formatCurrency(userDetail.balance) + ' ₽' : '...'}</span>
            </div>
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Всего оплачено</span>
              <span className="text-white text-sm font-mono">{userDetail ? formatCurrency(userDetail.total_paid) + ' ₽' : '...'}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Сообщений</span>
              <span className="text-white/80 text-sm font-mono">{userDetail ? formatNumber(userDetail.message_count) : '...'}</span>
            </div>
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Дата регистрации</span>
              <span className="text-white/80 text-sm font-mono">{userDetail ? (userDetail.created_at || '--') : '...'}</span>
            </div>
          </div>
          <div className="border-t border-white/5 pt-4">
            <span className="text-white/40 text-xs font-mono mb-3 block">Скорректировать баланс</span>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-white/30 text-[10px] font-mono mb-1">Сумма (+/-)</label>
                <input type="number" value={adjustAmount} onChange={function(e) { setAdjustAmount(e.target.value); }} placeholder="100"
                  className="w-28 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" />
              </div>
              <div>
                <label className="block text-white/30 text-[10px] font-mono mb-1">Причина</label>
                <input type="text" value={adjustReason} onChange={function(e) { setAdjustReason(e.target.value); }}
                  className="w-48 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" />
              </div>
              <button onClick={adjustBalance}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all cursor-pointer">
                Применить
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input type="text" value={searchInput} onChange={function(e) { setSearchInput(e.target.value); }} placeholder="Поиск по email или имени..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 transition-all font-mono" />
        </div>
        <button type="submit"
          className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all cursor-pointer">
          Поиск
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
              <div className="flex-1">Имя</div>
              <div className="w-40">Email</div>
              <div className="w-24 text-right">Баланс</div>
              <div className="w-24 text-right">Дата</div>
            </div>
            {users.length === 0 ? (
              <div className="py-8 text-center text-white/20 text-xs font-mono">Пользователи не найдены</div>
            ) : (
              users.map(function(u) {
                return (
                  <div key={u.id} onClick={function() { viewUser(u); }}
                    className="flex items-center gap-3 py-2.5 border-b border-white/[0.02] text-xs font-mono hover:bg-white/[0.02] cursor-pointer transition-colors">
                    <div className="flex-1 text-white/80">{u.name || '—'}</div>
                    <div className="w-40 text-white/50">{u.email}</div>
                    <div className="w-24 text-right text-white/70">{formatCurrency(u.balance)} ₽</div>
                    <div className="w-24 text-right text-white/30">{u.created_at ? u.created_at.slice(0, 10) : '—'}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
          <span className="text-white/30 text-xs font-mono">{total} пользователей</span>
          <div className="flex gap-1">
            <button onClick={function() { setPage(Math.max(1, page - 1)); }} disabled={page <= 1}
              className="px-3 py-1 rounded-lg text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
              ←
            </button>
            <span className="px-3 py-1 text-xs font-mono text-white/50">{page} / {totalPages()}</span>
            <button onClick={function() { setPage(Math.min(totalPages(), page + 1)); }} disabled={page >= totalPages()}
              className="px-3 py-1 rounded-lg text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Models ──
function ModelsTab() {
  var [models, setModels] = useState([]);
  var [showAddForm, setShowAddForm] = useState(false);
  var [editId, setEditId] = useState(null);
  var [newModel, setNewModel] = useState({ id: '', name: '', provider: '', category: 'text', price: '', context: 128000, speed: 90, badge: '', color: '#10B981', description: '', strengths: '' });
  var [editModel, setEditModel] = useState({});

  function fetchModels() {
    var token = getToken();
    if (!token) return;
    fetch('/api/admin/models', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(setModels).catch(function() {});
  }

  useEffect(function() { fetchModels(); }, []);

  function addModel(e) {
    e.preventDefault();
    var token = getToken();
    fetch('/api/admin/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(newModel),
    }).then(function(r) {
      if (r.ok) { setShowAddForm(false); setNewModel({ id: '', name: '', provider: '', category: 'text', price: '', context: 128000, speed: 90, badge: '', color: '#10B981', description: '', strengths: '' }); fetchModels(); }
      else { r.json().then(function(d) { alert(d.error || 'Ошибка'); }); }
    }).catch(function() {});
  }

  function startEdit(m) {
    setEditId(m.id);
    setEditModel(Object.assign({}, m));
  }

  function cancelEdit() {
    setEditId(null);
    setEditModel({});
  }

  function saveEdit(m) {
    var token = getToken();
    var body = {};
    for (var key in editModel) {
      if (editModel[key] !== m[key]) body[key] = editModel[key];
    }
    if (Object.keys(body).length === 0) { setEditId(null); return; }
    fetch('/api/admin/models/' + m.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body),
    }).then(function(r) { if (r.ok) { setEditId(null); fetchModels(); } }).catch(function() {});
  }

  function deleteModel(id) {
    if (!confirm('Удалить модель ' + id + '?')) return;
    var token = getToken();
    fetch('/api/admin/models/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token },
    }).then(function(r) { if (r.ok) fetchModels(); }).catch(function() {});
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-xs font-mono">{models.length} моделей</span>
        <button onClick={function() { setShowAddForm(!showAddForm); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all cursor-pointer">
          <Plus size={14} /> Добавить модель
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <span className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-4">Новая модель</span>
          <form onSubmit={addModel} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">ID *</label>
              <input type="text" value={newModel.id} onChange={function(e) { setNewModel(Object.assign({}, newModel, { id: e.target.value })); }} placeholder="provider/model"
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Название *</label>
              <input type="text" value={newModel.name} onChange={function(e) { setNewModel(Object.assign({}, newModel, { name: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Провайдер *</label>
              <input type="text" value={newModel.provider} onChange={function(e) { setNewModel(Object.assign({}, newModel, { provider: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Категория *</label>
              <select value={newModel.category} onChange={function(e) { setNewModel(Object.assign({}, newModel, { category: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 font-mono">
                <option value="text">text</option><option value="image">image</option><option value="audio">audio</option><option value="video">video</option><option value="embedding">embedding</option>
              </select></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Цена *</label>
              <input type="number" step="0.01" value={newModel.price} onChange={function(e) { setNewModel(Object.assign({}, newModel, { price: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Контекст</label>
              <input type="number" value={newModel.context} onChange={function(e) { setNewModel(Object.assign({}, newModel, { context: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Скорость</label>
              <input type="number" value={newModel.speed} onChange={function(e) { setNewModel(Object.assign({}, newModel, { speed: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Бейдж</label>
              <input type="text" value={newModel.badge} onChange={function(e) { setNewModel(Object.assign({}, newModel, { badge: e.target.value })); }} placeholder="🔥 Популярная"
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Цвет</label>
              <input type="text" value={newModel.color} onChange={function(e) { setNewModel(Object.assign({}, newModel, { color: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div className="sm:col-span-2"><label className="block text-white/30 text-[10px] font-mono mb-1">Описание</label>
              <input type="text" value={newModel.description} onChange={function(e) { setNewModel(Object.assign({}, newModel, { description: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div className="sm:col-span-2"><label className="block text-white/30 text-[10px] font-mono mb-1">Сильные стороны</label>
              <input type="text" value={newModel.strengths} onChange={function(e) { setNewModel(Object.assign({}, newModel, { strengths: e.target.value })); }} placeholder="Код, анализ, скорость"
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div className="sm:col-span-3 flex gap-2 mt-2">
              <button type="submit" className="px-5 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all cursor-pointer">
                <Check size={14} className="inline mr-1" /> Создать
              </button>
              <button type="button" onClick={function() { setShowAddForm(false); }}
                className="px-5 py-2 rounded-lg text-white/40 text-xs font-mono hover:text-white/70 transition-colors cursor-pointer">
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
              <div className="flex-1 min-w-[120px]">Модель</div>
              <div className="w-24">Провайдер</div>
              <div className="w-20">Категория</div>
              <div className="w-20 text-right">Цена</div>
              <div className="w-20 text-right">Контекст</div>
              <div className="w-16 text-right">Скорость</div>
              <div className="w-24 text-right">Действия</div>
            </div>
            {models.map(function(m) {
              var isEditing = editId === m.id;
              return (
                <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.02] text-xs font-mono">
                  {isEditing ? (
                    <>
                      <div className="flex-1 min-w-[120px]">
                        <input type="text" value={editModel.name || ''} onChange={function(e) { setEditModel(Object.assign({}, editModel, { name: e.target.value })); }}
                          className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30" />
                      </div>
                      <div className="w-24">
                        <input type="text" value={editModel.provider || ''} onChange={function(e) { setEditModel(Object.assign({}, editModel, { provider: e.target.value })); }}
                          className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30" />
                      </div>
                      <div className="w-20">
                        <select value={editModel.category || 'text'} onChange={function(e) { setEditModel(Object.assign({}, editModel, { category: e.target.value })); }}
                          className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30">
                          <option value="text">text</option><option value="image">image</option><option value="audio">audio</option><option value="video">video</option><option value="embedding">embedding</option>
                        </select>
                      </div>
                      <div className="w-20 text-right">
                        <input type="number" step="0.01" value={editModel.price || ''} onChange={function(e) { setEditModel(Object.assign({}, editModel, { price: e.target.value })); }}
                          className="w-20 bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30 text-right" />
                      </div>
                      <div className="w-20 text-right">
                        <input type="number" value={editModel.context || 0} onChange={function(e) { setEditModel(Object.assign({}, editModel, { context: e.target.value })); }}
                          className="w-20 bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30 text-right" />
                      </div>
                      <div className="w-16 text-right">
                        <input type="number" value={editModel.speed || 0} onChange={function(e) { setEditModel(Object.assign({}, editModel, { speed: e.target.value })); }}
                          className="w-16 bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30 text-right" />
                      </div>
                      <div className="w-24 text-right flex gap-1 justify-end">
                        <button onClick={function() { saveEdit(m); }}
                          className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"><Check size={14} /></button>
                        <button onClick={cancelEdit}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"><X size={14} /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-[120px] text-white/80">{m.name}
                        {m.badge && <span className="ml-1.5 text-white/30 text-[9px]">{m.badge}</span>}
                      </div>
                      <div className="w-24 text-white/50">{m.provider}</div>
                      <div className="w-20 text-white/50">{m.category}</div>
                      <div className="w-20 text-right text-white/70">{formatCurrency(m.price)}</div>
                      <div className="w-20 text-right text-white/50">{m.context ? formatNumber(m.context) : '—'}</div>
                      <div className="w-16 text-right text-white/50">{m.speed || '—'}</div>
                      <div className="w-24 text-right flex gap-1 justify-end">
                        <button onClick={function() { startEdit(m); }}
                          className="p-1 text-white/30 hover:text-white/70 transition-colors cursor-pointer"><Edit2 size={13} /></button>
                        <button onClick={function() { deleteModel(m.id); }}
                          className="p-1 text-white/30 hover:text-red-400 transition-colors cursor-pointer"><Trash2 size={13} /></button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: Providers / Analytics ──
function ProvidersTab() {
  var [data, setData] = useState(null);
  var [providers, setProviders] = useState([]);
  var [editId, setEditId] = useState(null);
  var [editProvider, setEditProvider] = useState({});
  var [showKey, setShowKey] = useState({});
  var [testingKey, setTestingKey] = useState({});
  var [testResults, setTestResults] = useState({});

  function fetchProviders() {
    var token = getToken();
    if (!token) return;
    fetch('/api/admin/providers', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(setProviders).catch(function() {});
  }

  function fetchStats() {
    var token = getToken();
    if (!token) return;
    fetch('/api/admin/provider-stats', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(setData).catch(function() {});
  }

  useEffect(function() { fetchProviders(); fetchStats(); }, []);

  function startEdit(p) {
    setEditId(p.id);
    setEditProvider(Object.assign({}, p, { api_key: p.api_key || '' }));
  }

  function cancelEdit() {
    setEditId(null);
    setEditProvider({});
  }

  function saveEdit(p) {
    var token = getToken();
    var body = {};
    for (var key in editProvider) {
      if (editProvider[key] !== p[key]) body[key] = editProvider[key];
    }
    if (Object.keys(body).length === 0) { setEditId(null); return; }
    fetch('/api/admin/providers/' + p.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body),
    }).then(function(r) {
      if (r.ok) { setEditId(null); fetchProviders(); fetchStats(); }
    }).catch(function() {});
  }

  function toggleActive(p) {
    var token = getToken();
    fetch('/api/admin/providers/' + p.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ is_active: p.is_active ? 0 : 1 }),
    }).then(function(r) { if (r.ok) { fetchProviders(); fetchStats(); } }).catch(function() {});
  }

  function testKey(p) {
    var token = getToken();
    setTestingKey(Object.assign({}, testingKey, (function() { var o = {}; o[p.id] = true; return o; })()));
    setTestResults(Object.assign({}, testResults, (function() { var o = {}; o[p.id] = null; return o; })()));

    fetch('/api/admin/providers/' + p.id + '/test', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
    }).then(function(r) { return r.json(); })
      .then(function(result) {
        setTestResults(Object.assign({}, testResults, (function() { var o = {}; o[p.id] = result; return o; })()));
        setTestingKey(Object.assign({}, testingKey, (function() { var o = {}; o[p.id] = false; return o; })()));
      }).catch(function() {
        setTestingKey(Object.assign({}, testingKey, (function() { var o = {}; o[p.id] = false; return o; })()));
      });
  }

  function maskKey(key) {
    if (!key) return '—';
    if (key.length <= 8) return key.slice(0, 2) + '••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  }

  var providerStats = data ? data.providers : [];
  var totalMessages = data ? data.total_messages : 0;

  return (
    <div className="space-y-6">
      {/* Metrics bars */}
      {data && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-xs font-mono uppercase tracking-wider">Метрики провайдеров</span>
            <span className="text-white/20 text-xs font-mono">{totalMessages} сообщений</span>
          </div>
          <div className="space-y-3">
            {providerStats.map(function(s) {
              var barColor = 'bg-emerald-500';
              if (s.pct < 10) barColor = 'bg-white/30';
              else if (s.pct < 25) barColor = 'bg-amber-500';
              else if (s.pct < 50) barColor = 'bg-blue-500';
              else barColor = 'bg-green-500';
              return (
                <div key={s.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className={'flex items-center gap-1.5 ' + (s.is_active ? 'text-white/70' : 'text-white/30')}>
                      <div className={'size-1.5 rounded-full ' + (s.is_active ? 'bg-emerald-400' : 'bg-white/20')} />
                      {s.name}
                      {!s.is_active && <span className="text-white/20">(выкл)</span>}
                      {s.api_key ? null : <span className="text-amber-400/60 text-[10px]">нет ключа</span>}
                    </span>
                    <span className="text-white/40">{s.pct}% &middot; {s.message_count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className={'h-full rounded-full transition-all duration-500 ' + barColor} style={{ width: Math.max(s.pct, 1) + '%' }} />
                  </div>
                </div>
              );
            })}
            {totalMessages === 0 && (
              <div className="text-center py-4 text-white/20 text-xs font-mono">
                Нет сообщений для статистики
              </div>
            )}
          </div>
        </div>
      )}

      {/* Provider settings table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <span className="text-white/50 text-xs font-mono uppercase tracking-wider mb-4 block">Настройки провайдеров</span>
        <div className="overflow-x-auto">
          <div className="min-w-[750px]">
            <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
              <div className="flex-1 min-w-[100px]">Провайдер</div>
              <div className="w-48">Base URL</div>
              <div className="w-48">API Key</div>
              <div className="w-16 text-center">Активен</div>
              <div className="w-16 text-center">Проверка</div>
              <div className="w-20 text-right">Действия</div>
            </div>
            {providers.map(function(p) {
              var isEditing = editId === p.id;
              var isTesting = testingKey[p.id];
              var testResult = testResults[p.id];
              return (
                <div key={p.id} className="flex items-center gap-3 py-3 border-b border-white/[0.02] text-xs font-mono">
                  {isEditing ? (
                    <>
                      <div className="flex-1 min-w-[100px] text-white/80 font-medium">{p.name}</div>
                      <div className="w-48">
                        <input type="text" value={editProvider.base_url || ''} onChange={function(e) { setEditProvider(Object.assign({}, editProvider, { base_url: e.target.value })); }}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-white/30" />
                      </div>
                      <div className="w-48">
                        <div className="relative">
                          <input type={showKey[p.id] ? 'text' : 'password'} value={editProvider.api_key || ''} onChange={function(e) { setEditProvider(Object.assign({}, editProvider, { api_key: e.target.value })); }}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1.5 pr-7 text-white text-xs outline-none focus:border-white/30" />
                          <button onClick={function() { setShowKey(Object.assign({}, showKey, (function() { var o = {}; o[p.id] = !showKey[p.id]; return o; })())); }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer">
                            {showKey[p.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>
                      <div className="w-16 text-center">
                        <button onClick={function() { toggleActive(p); }}
                          className={'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer ' + (p.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/30 bg-white/[0.03]')}>
                          {p.is_active ? 'Да' : 'Нет'}
                        </button>
                      </div>
                      <div className="w-16 text-center" />
                      <div className="w-20 text-right flex gap-1 justify-end">
                        <button onClick={function() { saveEdit(p); }}
                          className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"><Check size={14} /></button>
                        <button onClick={cancelEdit}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"><X size={14} /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-[100px] flex items-center gap-2 text-white/80 font-medium">
                        <Server size={14} className="text-white/30" />
                        {p.name}
                      </div>
                      <div className="w-48 text-white/50 truncate" title={p.base_url}>
                        <Globe size={11} className="inline mr-1 text-white/20" />
                        {p.base_url || '—'}
                      </div>
                      <div className="w-48 text-white/40">
                        <Key size={11} className="inline mr-1 text-white/20" />
                        {maskKey(p.api_key)}
                      </div>
                      <div className="w-16 text-center">
                        <button onClick={function() { toggleActive(p); }}
                          className={'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer ' + (p.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/30 bg-white/[0.03]')}>
                          {p.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                      </div>
                      <div className="w-16 text-center">
                        {isTesting ? (
                          <span className="text-white/30 text-[10px]">...</span>
                        ) : testResult ? (
                          <span className={'text-[10px] font-medium ' + (testResult.success ? 'text-emerald-400' : 'text-red-400')} title={testResult.message + ' (' + testResult.latency + 'ms)'}>
                            {testResult.success ? '✓' : '✗'}
                          </span>
                        ) : (
                          <button onClick={function() { testKey(p); }}
                            className="text-white/30 hover:text-white/70 transition-colors cursor-pointer p-1"
                            title={p.api_key ? 'Проверить ключ' : 'Сначала задайте API-ключ'}>
                            <RefreshCw size={12} />
                          </button>
                        )}
                      </div>
                      <div className="w-20 text-right">
                        <button onClick={function() { startEdit(p); }}
                          className="p-1 text-white/30 hover:text-white/70 transition-colors cursor-pointer"><Edit2 size={13} /></button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Panel ──
var TABS = [
  { id: 'overview', label: 'Обзор', icon: Activity },
  { id: 'users', label: 'Пользователи', icon: Users },
  { id: 'models', label: 'Модели', icon: Cpu },
  { id: 'providers', label: 'Аналитика', icon: Shield },
];

function AdminDashboard({ onLogout }) {
  var navigate = useNavigate();
  var [tab, setTab] = useState('overview');

  function renderTab() {
    switch (tab) {
      case 'overview': return <OverviewTab />;
      case 'users': return <UsersTab />;
      case 'models': return <ModelsTab />;
      case 'providers': return <ProvidersTab />;
      default: return <OverviewTab />;
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={function() { navigate('/'); }}
            className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer">
            <ArrowLeft size={18} />
          </button>
          <div className="size-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-black text-sm font-bold">A</span>
          </div>
          <span className="text-white font-semibold">Админ-панель</span>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
          <LogOut size={14} />
          Выйти
        </button>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-1 flex-wrap border border-white/10 rounded-xl p-1 bg-white/[0.02]">
          {TABS.map(function(t) {
            var active = tab === t.id;
            return (
              <button key={t.id} onClick={function() { setTab(t.id); }}
                className={'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ' + (
                  active
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                )}>
                <t.icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {renderTab()}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  var [authed, setAuthed] = useState(false);
  var [username, setUsername] = useState('admin');
  var [password, setPassword] = useState('admin');
  var [showPw, setShowPw] = useState(false);
  var [error, setError] = useState('');
  var navigate = useNavigate();
  var [initCheck, setInitCheck] = useState(false);

  useEffect(function() {
    var token = getToken();
    if (token) setAuthed(true);
    setInitCheck(true);
  }, []);

  var handleLogin = async function(e) {
    e.preventDefault();
    setError('');

    try {
      var res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username || 'admin', password: password || 'admin' }),
      });
      var data = await res.json();
      if (res.ok) {
        localStorage.setItem('velorix_admin_token', data.token);
        setAuthed(true);
      } else {
        setError(data.error || 'Неверный логин или пароль');
      }
    } catch (err) {
      setError('Не удалось подключиться к серверу');
    }
  };

  if (!initCheck) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-white/30 text-xs font-mono">Загрузка...</div>
      </div>
    );
  }

  if (authed) {
    return <AdminDashboard onLogout={function() { localStorage.removeItem('velorix_admin_token'); setAuthed(false); navigate('/'); }} />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="size-12 rounded-2xl bg-white mx-auto flex items-center justify-center mb-4">
            <Shield size={24} className="text-black" />
          </div>
          <h1 className="text-white text-xl font-semibold">Админ-панель</h1>
          <p className="text-white/30 text-xs mt-1 font-mono">Управление сервисом</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-white/40 text-xs font-mono mb-1.5 ml-1">Логин</label>
            <input type="text" value={username} onChange={function(e) { setUsername(e.target.value); }} placeholder="admin"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200 font-mono" />
          </div>
          <div>
            <label className="block text-white/40 text-xs font-mono mb-1.5 ml-1">Пароль</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={function(e) { setPassword(e.target.value); }} placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200 font-mono" />
              <button type="button" onClick={function() { setShowPw(function(v) { return !v; }); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors" tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-400/80 text-xs font-mono text-center bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          <button type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-medium hover:opacity-80 transition-all duration-200 mt-6 cursor-pointer">
            Войти <ArrowRight size={15} />
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={function() { navigate('/'); }}
            className="text-white/20 hover:text-white/50 text-xs font-mono transition-colors cursor-pointer">
            ← На главную
          </button>
        </div>
      </div>
    </div>
  );
}
