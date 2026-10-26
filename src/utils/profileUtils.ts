import { UserProfile } from '../types';

const PROFILE_KEY = 'userProfile';

// Función para cargar el perfil del usuario
export function loadUserProfile(): UserProfile | null {
  try {
    const profileData = localStorage.getItem(PROFILE_KEY);
    if (!profileData) return null;
    return JSON.parse(profileData) as UserProfile;
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
}

// Función para guardar el perfil del usuario
export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw new Error('No se pudo guardar el perfil. Posiblemente el archivo de imagen es muy grande.');
  }
}

// Función para crear un nuevo perfil
export function createNewUserProfile(name: string): UserProfile {
  const now = new Date().toISOString();
  return {
    id: `user_${Date.now()}`,
    name,
    createdAt: now,
    updatedAt: now,
  };
}

// Función para actualizar el perfil existente
export function updateUserProfile(
  existingProfile: UserProfile | null,
  updates: Partial<UserProfile>
): UserProfile {
  const now = new Date().toISOString();
  
  if (existingProfile) {
    return {
      ...existingProfile,
      ...updates,
      updatedAt: now,
    };
  }
  
  // Si no existe perfil, crear uno nuevo
  return {
    id: `user_${Date.now()}`,
    name: updates.name || 'Usuario',
    email: updates.email,
    phone: updates.phone,
    avatar: updates.avatar,
    createdAt: now,
    updatedAt: now,
  };
}

// Función para convertir imagen a base64
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Función para validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Función para validar teléfono
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\+\-\(\)]+$/;
  return phoneRegex.test(phone);
}
