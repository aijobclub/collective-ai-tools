import { createPreviewServer } from '../ssr/local-preview.mjs';

const port = Number(process.env.PORT || 4173);
createPreviewServer().listen(port, '127.0.0.1', () => {
  console.log(`Read-only public HTML preview: http://127.0.0.1:${port}`);
});
