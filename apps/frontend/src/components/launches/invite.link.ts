// Postacı: "Kanal Ekle" yanındaki davet bağlantısı. Müşteriye gidecek bağlantı,
// neye onay verildiğini anlatan sayfaya açılır. Kanal türü bağlantıyla
// bağlanamıyorsa (ek bilgi isteyenler gibi) null döner; çağıran eski yola düşer.

export const createInviteLink = async (
  fetch: (url: string, options?: RequestInit) => Promise<Response>,
  integration: string
): Promise<string | null> => {
  const response = await fetch('/invite-links', {
    method: 'POST',
    body: JSON.stringify({ integration }),
  });
  if (!response.ok) {
    return null;
  }
  const { url } = await response.json();
  return url || null;
};
