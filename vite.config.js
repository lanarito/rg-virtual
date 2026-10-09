// Servidor local con HTTPS (necesario para cámara, GPS y WebXR en el celular).
import basicSsl from '@vitejs/plugin-basic-ssl';

export default {
  plugins: [basicSsl()],
  server: { host: true, port: 5443 }
};
