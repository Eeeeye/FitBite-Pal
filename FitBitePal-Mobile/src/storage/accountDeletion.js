// Each closure is bound to the owner who confirmed the request.
async function deleteSignedInAccount({ request, password, removeChat, storage, userId, signOutIfCurrent, notifyOtherTabs }) {
  const response = await request(password);
  if (!response?.success) throw new Error('Account deletion was not confirmed');
  // Start invalidating this session before waiting for device I/O. Another sign-in may already own the UI.
  const results = await Promise.allSettled([
    signOutIfCurrent(), removeChat(),
    storage.multiRemove(['checkInDates_' + userId, 'weightGoal_' + userId, 'bodyFatGoal_' + userId]),
  ]);
  notifyOtherTabs();
  return { localDataCleared: results.every(result => result.status === 'fulfilled') };
}

module.exports = { deleteSignedInAccount };
