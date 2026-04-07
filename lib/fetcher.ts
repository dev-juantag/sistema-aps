export const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("salud-pereira-token") : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem("salud-pereira-token");
      localStorage.removeItem("salud-pereira-user");
      window.location.href = "/?expired=true";
    }

    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Error fetcher SWR");
  }

  return res.json();
}
