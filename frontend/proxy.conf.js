module.exports = {
  '/api': {
    target: 'http://localhost:3000',
    secure: false,
    changeOrigin: true,
    configure(proxy) {
      // Vite logs refused connections before Angular can show its friendly state.
      const emit = proxy.emit.bind(proxy);
      proxy.emit = (event, ...args) => {
        if (event === 'error') {
          const response = args[2];
          if (response && !response.headersSent && !response.writableEnded) {
            response.writeHead(502, { 'Content-Type': 'text/plain' });
            response.end();
          }
          return true;
        }
        return emit(event, ...args);
      };
    },
  },
};
