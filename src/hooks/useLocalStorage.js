export function useLocalStorage() {
  const get = (key, fallback = null) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
    catch { return fallback }
  }
  const set = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  }
  const remove = (key) => { try { localStorage.removeItem(key) } catch {} }
  return { get, set, remove }
}
