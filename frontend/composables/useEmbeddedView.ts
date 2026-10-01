/** Page ouverte dans la WebView de l'app mobile (`?embed=1`) : sans navigation du site. */
export function useEmbeddedView() {
  const route = useRoute()
  return computed(() => route.query.embed === '1')
}
