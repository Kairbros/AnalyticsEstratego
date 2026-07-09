import { useEffect } from 'react';

export default function useLeadConnector() {
  useEffect(() => {
    // Check if script is already loaded to avoid duplicates
    const existingScript = document.querySelector('script[src="https://widgets.leadconnectorhq.com/loader.js"]');
    let script = existingScript;

    if (!script) {
      script = document.createElement('script');
      script.src = "https://widgets.leadconnectorhq.com/loader.js";
      script.setAttribute('data-resources-url', "https://widgets.leadconnectorhq.com/chat-widget/loader.js");
      script.setAttribute('data-widget-id', "6a502fe2c30ab69597bde690");
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      // Clean up the script if we added it
      if (!existingScript && script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // Clean up the rendered widget elements
      const widgetElement = document.querySelector('chat-widget');
      if (widgetElement) {
        widgetElement.remove();
      }
    };
  }, []);
}
