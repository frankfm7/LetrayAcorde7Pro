import { useState, useEffect, useRef } from 'react';
import { songs as baseSongs } from '../data/songs';
import { compressImageToDataUrl } from '../utils/imageUtils';
import { mergeSongs } from '../utils/hymnalUtils';
import { ChevronLeft, User, Mail, Calendar, Music, Star, ListMusic, Camera, Phone, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types';
import { loadUserProfile, updateUserProfile, saveUserProfile, imageToBase64, isValidEmail, isValidPhone } from '../utils/profileUtils';
import { useNotification } from './NotificationProvider';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle } from '../lib/auth';

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { state } = useApp();
  const { user, loading: authLoading } = useAuth();
  const [loginError, setLoginError] = useState('');
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
      </div>

      <div className="rounded-2xl p-6 mb-6 card-shadow-md" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
        {authLoading ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Cargando tu perfil…</p>
        ) : user ? (
          (() => {
            const meta = (user.user_metadata || {}) as Record<string, string | undefined>;
            const name = meta.full_name || meta.name || 'Usuario';
            const photo = meta.avatar_url || meta.picture;
            return (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
                  {photo ? <img src={photo} alt="Foto de perfil" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <User size={40} style={{ color: 'var(--accent)' }} />}
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold truncate">{name}</div>
                  <div className="flex items-center gap-1.5 text-sm truncate" style={{ color: 'var(--text-muted)' }}><Mail size={14} /> {user.email}</div>
                  {user.created_at && (
                    <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: 'var(--text-muted)' }}><Calendar size={12} /> Miembro desde {new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}</div>
                  )}
                  <div className="text-[11px] mt-2 font-semibold" style={{ color: 'var(--accent)' }}>Sesión iniciada con Google</div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="text-center py-6">
            <User size={40} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
            <p className="font-bold mb-3">Inicia sesión para ver tu perfil</p>
            <button
              onClick={async () => { setLoginError(''); const err = await signInWithGoogle(); if (err) setLoginError(err); }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700"
            >
              Iniciar sesión con Google
            </button>
            {loginError && <p className="text-xs text-red-500 mt-2">{loginError}</p>}
          </div>
        )}
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

    </div>
  );
}
