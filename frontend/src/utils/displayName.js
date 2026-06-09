export function getDisplayName(user) {
  return user?.nickname || user?.username || '用户';
}

export function getDisplayInitial(user) {
  return getDisplayName(user).charAt(0).toUpperCase();
}

export function getAvatarUrl(userOrAvatar) {
  const avatar = typeof userOrAvatar === 'string' ? userOrAvatar : userOrAvatar?.avatar;

  if (!avatar) return '/uploads/avatars/defaults/default-1.svg';
  if (avatar.startsWith('/uploads/')) return avatar;
  if (avatar.startsWith('custom/')) return `/uploads/avatars/${avatar}`;
  return `/uploads/avatars/defaults/${avatar}.svg`;
}
