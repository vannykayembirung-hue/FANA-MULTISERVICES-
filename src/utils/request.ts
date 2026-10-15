export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error('Connexion au serveur impossible. Vérifiez le déploiement Vercel et votre connexion Internet.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Le serveur API n’a pas répondu en JSON. Vérifiez les fonctions Vercel et leur configuration.');
  }
  const body = await response.json();
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : `Erreur serveur (${response.status}).`);
  }
  return body as T;
}
