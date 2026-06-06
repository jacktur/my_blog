export function getDisplayName(user) {
  return user?.nickname || user?.username || '用户';
}

export function getDisplayInitial(user) {
  return getDisplayName(user).charAt(0).toUpperCase();
}
