import { useState } from 'react';
import { ref, getDownloadURL, listAll } from 'firebase/storage';
import { storage } from '../services/firebase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export function usePhotos() {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Get all photos from a cliente
  const getClientePhotos = (cliente) => {
    const photos = [];

    if (cliente?.fotoUrl) {
      photos.push(cliente.fotoUrl);
    }

    if (cliente?.fotoUrls && Array.isArray(cliente.fotoUrls)) {
      photos.push(...cliente.fotoUrls);
    }

    return photos.slice(0, 3); // Max 3 photos
  };

  // Get all photos from all clientes
  const getAllPhotos = (clientes) => {
    const photos = [];

    clientes.forEach(cliente => {
      const clientePhotos = getClientePhotos(cliente);
      clientePhotos.forEach(url => {
        photos.push({
          url,
          clienteId: cliente.id,
          clienteName: cliente.nombre || cliente.numeroCliente || cliente.id
        });
      });
    });

    return photos;
  };

  // Extract filename from Firebase Storage URL
  const getFilenameFromUrl = (url) => {
    try {
      const decodedUrl = decodeURIComponent(url);
      const matches = decodedUrl.match(/\/o\/(.+?)\?/);
      if (matches && matches[1]) {
        const path = matches[1];
        return path.split('/').pop();
      }
      // Fallback: use last part of URL
      return url.split('/').pop().split('?')[0] || 'foto.jpg';
    } catch {
      return 'foto.jpg';
    }
  };

  // Download single photo
  const downloadPhoto = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, filename || getFilenameFromUrl(url));
    } catch (err) {
      console.error('Error downloading photo:', err);
      throw err;
    }
  };

  // Download multiple photos as ZIP
  const downloadPhotosAsZip = async (photos, zipName = 'fotos_catastro.zip') => {
    if (photos.length === 0) return;

    setDownloading(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const total = photos.length;
      let completed = 0;

      for (const photo of photos) {
        try {
          const url = typeof photo === 'string' ? photo : photo.url;
          const response = await fetch(url);
          const blob = await response.blob();

          let filename = getFilenameFromUrl(url);

          // If photo has cliente info, prefix with cliente name
          if (typeof photo === 'object' && photo.clienteName) {
            filename = `${photo.clienteName}_${filename}`;
          }

          zip.file(filename, blob);
          completed++;
          setProgress(Math.round((completed / total) * 100));
        } catch (err) {
          console.error('Error downloading photo:', url, err);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, zipName);
    } catch (err) {
      console.error('Error creating ZIP:', err);
      throw err;
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  return {
    getClientePhotos,
    getAllPhotos,
    downloadPhoto,
    downloadPhotosAsZip,
    downloading,
    progress,
    getFilenameFromUrl
  };
}
