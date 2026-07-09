import { useEffect } from 'react';

export default function useLeadConnector() {
  useEffect(() => {
    // Create style element to make the chat widget visible
    const style = document.createElement('style');
    style.id = 'show-chat-widget-style';
    style.innerHTML = `
      chat-widget {
        display: block !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Remove the style on unmount, hiding the widget again
      const existingStyle = document.getElementById('show-chat-widget-style');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
}
