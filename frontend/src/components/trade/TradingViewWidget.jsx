import { useEffect, useRef, memo } from 'react';

/**
 * Generic TradingView embed wrapper.
 * A fresh wrapper node is created per mount and removed on cleanup, which keeps
 * the injected <script> attached to its parent (avoids StrictMode double-invoke
 * "querySelector of null" errors from the embed script).
 */
function TradingViewWidget({ scriptSrc, config }) {
  const containerRef = useRef(null);
  const configKey = JSON.stringify(config);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.height = '100%';
    wrapper.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    wrapper.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = configKey;
    wrapper.appendChild(script);

    container.appendChild(wrapper);

    return () => {
      wrapper.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptSrc, configKey]);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}

export default memo(TradingViewWidget);
