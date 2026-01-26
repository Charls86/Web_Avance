import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export function usePhotos() {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Get all photos from a cliente (without duplicates)
  const getClientePhotos = (cliente) => {
    const photosSet = new Set();

    if (cliente?.fotoUrl) {
      photosSet.add(cliente.fotoUrl);
    }

    if (cliente?.fotoUrls && Array.isArray(cliente.fotoUrls)) {
      cliente.fotoUrls.forEach(url => photosSet.add(url));
    }

    // Convert Set to Array and limit to 3
    return Array.from(photosSet).slice(0, 3);
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

  // Download single photo - opens in new tab to avoid CORS
  const downloadPhoto = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = filename || getFilenameFromUrl(url);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch image with CORS workaround
  const fetchImageAsBlob = async (url) => {
    try {
      // Try direct fetch first
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        return await response.blob();
      }
    } catch {
      // If CORS fails, try with no-cors (will get opaque response)
    }

    // Fallback: use image element to load and convert to blob
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.95);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
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
      let successCount = 0;

      for (const photo of photos) {
        const photoUrl = typeof photo === 'string' ? photo : photo.url;

        try {
          const blob = await fetchImageAsBlob(photoUrl);

          let filename = getFilenameFromUrl(photoUrl);

          // If photo has cliente info, prefix with cliente name
          if (typeof photo === 'object' && photo.clienteName) {
            // Clean filename
            const cleanName = photo.clienteName.replace(/[^a-zA-Z0-9]/g, '_');
            filename = `${cleanName}_${filename}`;
          }

          zip.file(filename, blob);
          successCount++;
        } catch (err) {
          console.warn('Could not download photo:', photoUrl, err.message);
        }

        completed++;
        setProgress(Math.round((completed / total) * 100));
      }

      if (successCount > 0) {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, zipName);
      } else {
        alert('No se pudieron descargar las fotos. Intente descargarlas individualmente.');
      }
    } catch (err) {
      console.error('Error creating ZIP:', err);
      alert('Error al crear el archivo ZIP');
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
