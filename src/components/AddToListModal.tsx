import { useState } from 'react';
import { X, Check, Plus, ListMusic, Music } from 'lucide-react';
import { Song } from '../types';
import { useApp } from '../context/AppContext';
import { newSongItem, uid } from '../utils/listUtils';

interface Props {
  song: Song;
  onClose: () => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

/** Agrega una canción a una lista (nueva o existente) o a una orden de evento. */
export default function AddToListModal({ song, onClose, showNotification }: Props) {
  const { state, addSetlist, addSongToSetlist, addOrder, updateOrder } = useApp();
  const [tab, setTab] = useState<'list' | 'order'>('list');
  const [newName, setNewName] = useState('');

  const addToSetlist = (setlistId: string) => {
    const list = state.setlists.find(s => s.id === setlistId);
    if (!list) return;
    if (list.songs.some(s => s.songId === song.id)) {
      showNotification('Esa canción ya está en la lista', 'info');
      return;
    }
    addSongToSetlist(setlistId, { songId: song.id, transposition: 0, notes: '', order: list.songs.length });
    showNotification(`Agregada a "${list.name}"`, 'success');
  };

  const addToOrder = (orderId: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    updateOrder({ ...order, items: [...order.items, newSongItem(song)] });
    showNotification(`Agregada a "${order.name}"`, 'success');
  };

  const createAndAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (tab === 'list') {
      addSetlist(name, [{ songId: song.id, transposition: 0, notes: '', order: 0 }]);
      showNotification(`Lista "${name}" creada`, 'success');
    } else {
      addOrder({
        id: uid(),
        name,
        type: 'Evento',
        date: new Date().toISOString().split('T')[0],
        items: [newSongItem(song)],
      });
      showNotification(`Orden "${name}" creada`, 'success');
    }
    setNewName('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold">Agregar a…</h3>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{song.title}</p>
          </div>
          <button onClick={onClose} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
        </div>

        <div className="flex gap-2 p-1 rounded-2xl mb-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          {([['list', 'Listas'], ['order', 'Órdenes']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ backgroundColor: tab === id ? 'var(--card-bg)' : 'transparent', color: tab === id ? 'var(--accent)' : 'var(--text-muted)', boxShadow: tab === id ? 'var(--card-shadow)' : 'none' }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto space-y-2 min-h-0 flex-1 pb-2">
          {tab === 'list' && state.setlists.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Aún no tienes listas. Crea la primera abajo.</p>
          )}
          {tab === 'order' && state.orders.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Aún no tienes órdenes. Crea la primera abajo.</p>
          )}

          {tab === 'list' && state.setlists.map(list => {
            const inList = list.songs.some(s => s.songId === song.id);
            return (
              <button key={list.id} onClick={() => addToSetlist(list.id)} disabled={inList} className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', opacity: inList ? 0.6 : 1 }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}><ListMusic size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{list.name}</span><span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{list.songs.length} canciones</span></span>
                {inList ? <Check size={18} style={{ color: 'var(--accent)' }} /> : <Plus size={18} style={{ color: 'var(--accent)' }} />}
              </button>
            );
          })}

          {tab === 'order' && state.orders.map(order => (
            <button key={order.id} onClick={() => addToOrder(order.id)} className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}><Music size={18} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{order.name}</span><span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{order.type} • {order.items.length} elementos</span></span>
              <Plus size={18} style={{ color: 'var(--accent)' }} />
            </button>
          ))}
        </div>

        <div className="pt-3 border-t flex gap-2" style={{ borderColor: 'var(--border-color)' }}>
          <input
            className="field"
            placeholder={tab === 'list' ? 'Nueva lista…' : 'Nueva orden…'}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createAndAdd()}
          />
          <button className="btn btn-primary" onClick={createAndAdd} disabled={!newName.trim()}><Plus size={16} /> Crear</button>
        </div>
      </div>
    </div>
  );
}
