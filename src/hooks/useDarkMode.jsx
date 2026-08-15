import { useEffect } from 'react';

// O Kolmi é light-only. Sincronizar a classe `dark` com o esquema do
// sistema deixava o texto branco sobre fundos claros (o app não usa cores
// semânticas dark-aware), tornando as letras ilegíveis. Agora garantimos
// que a classe `dark` NUNCA é aplicada automaticamente.
export default function useDarkMode() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);
}