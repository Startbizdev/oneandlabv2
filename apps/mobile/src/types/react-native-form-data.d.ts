/** React Native envoie un fichier local en multipart à partir de ce descripteur, absent du typage DOM. */
interface FormData {
  append(name: string, value: { uri: string; name: string; type: string }): void;
}
