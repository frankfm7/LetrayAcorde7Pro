import { useState, useEffect, useRef } from 'react';
import { songs as baseSongs } from '../data/songs';
import { compressImageToDataUrl } from '../utils/imageUtils';
import { mergeSongs } from '../utils/hymnalUtils';
import { ChevronLeft, User, Mail, Calendar, Music, Star, ListMusic, Camera, Phone, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types';
import { loadUserProfile, updateUserProfile, saveUserProfile, imageToBase64, isValidEmail, isValidPhone } from '../utils/profileUtils';
import { useNotification } from './NotificationProvider';
import LoginModal from './LoginModal';

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { state } = useApp();
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | undefined>();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const loadedProfile = loadUserProfile();
    setProfile(loadedProfile);
    if (loadedProfile) {
      setEditName(loadedProfile.name || '');
      setEditEmail(loadedProfile.email || '');
      setEditPhone(loadedProfile.phone || '');
      setEditAvatar(loadedProfile.avatar);
    } else {
      setEditName('Usuario');
    }
  }, []);

  const totalSongs = mergeSongs(baseSongs, state.customSongs).length;
  const totalHymnals = state.customHymnals.length + 1;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification('La imagen es muy grande. Máximo 5MB', 'error');
      return;
    }

    try {
      const base64 = await compressImageToDataUrl(file, 400, 0.85);
      setEditAvatar(base64);
    } catch (error) {
      showNotification('Error al procesar la imagen', 'error');
    }
  };

  const handleSave = () => {
    if (!editName.trim() || editName.trim().length < 2) {
      showNotification('El nombre debe tener al menos 2 caracteres', 'error');
      return;
    }

    if (editEmail && !isValidEmail(editEmail)) {
      showNotification('El formato del email no es válido', 'error');
      return;
    }

    if (editPhone && !isValidPhone(editPhone)) {
      showNotification('El teléfono solo puede contener números, +, -, espacios y paréntesis', 'error');
      return;
    }

    try {
      const updatedProfile = updateUserProfile(profile, {
        name: editName.trim(),
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        avatar: editAvatar,
      });

      saveUserProfile(updatedProfile);
      setProfile(updatedProfile);
      showNotification('Perfil guardado exitosamente', 'success');
    } catch (error) {
      showNotification('Error al guardar el perfil', 'error');
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditName(profile.name || '');
      setEditEmail(profile.email || '');
      setEditPhone(profile.phone || '');
      setEditAvatar(profile.avatar);
    } else {
      setEditName('Usuario');
      setEditEmail('');
      setEditPhone('');
      setEditAvatar(undefined);
    }
    showNotification('Cambios cancelados', 'info');
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Mi Perfil</h1>
        </div>
        <button 
          onClick={() => setShowLoginModal(true)}
          className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          <User size={14} />
          Iniciar sesión
        </button>
      </div>

      <div className="rounded-2xl p-6 mb-6 card-shadow-md" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
              {editAvatar ? (
                <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={40} style={{ color: 'var(--accent)' }} />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 rounded-full"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              Cambiar foto
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Nombre *
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={50}
              className="w-full p-3 rounded-xl border text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="text-xs font-bold mb-2 block uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Mail size={14} />
              Correo electrónico
            </label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full p-3 rounded-xl border text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              placeholder="tu@email.com"
            />
            <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Lock size={10} />
              <span>Se usará para sincronización futura</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold mb-2 block uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Phone size={14} />
              Número de teléfono (opcional)
            </label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full p-3 rounded-xl border text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              placeholder="+1 234 567 8900"
            />
            <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Lock size={10} />
              <span>Se usará para sincronización futura</span>
            </div>
          </div>

          {profile?.createdAt && (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
              <div className="flex-1">
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Miembro desde</div>
                <div className="text-sm font-medium">
                  {new Date(profile.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            Guardar cambios
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-6 mb-6 card-shadow-md" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-bold mb-4">Mis Estadísticas</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <Music size={24} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
            <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{totalSongs}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Canciones</div>
          </div>

          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <Star size={24} className="mx-auto mb-2" style={{ color: 'var(--gold)' }} />
            <div className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>{state.favorites.length}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Favoritos</div>
          </div>

          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <Music size={24} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
            <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{totalHymnals}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Cancioneros</div>
          </div>

          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <ListMusic size={24} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
            <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{state.setlists.length}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Listas</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-6 card-shadow-md" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-lg font-bold mb-4">Acerca de Letra&Acorde7Pro</h3>
        
        <div className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <p><strong>Versión:</strong> 1.0 Premium</p>
          <p><strong>Desarrollado por:</strong> Letra&Acorde7Pro Team</p>
          <p><strong>Descripción:</strong> Gestión profesional de letras y acordes para músicos y cantantes</p>
          <p className="pt-2 text-xs">© 2026 Letra&Acorde7Pro. Todos los derechos reservados.</p>
        </div>
      </div>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  );
}
