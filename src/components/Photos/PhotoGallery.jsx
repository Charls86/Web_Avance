import { useState } from 'react';
import { Image, Check, X, Download, ZoomIn } from 'lucide-react';
import { usePhotos } from '../../hooks/usePhotos';

export default function PhotoGallery({ clientes }) {
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const { getAllPhotos, downloadPhotosAsZip, downloading, progress, getFilenameFromUrl } = usePhotos();

  const allPhotos = getAllPhotos(clientes);

  const togglePhoto = (index) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPhotos(newSelected);
  };

  const selectAll = () => {
    if (selectedPhotos.size === allPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(allPhotos.map((_, i) => i)));
    }
  };

  const downloadSelected = async () => {
    const selected = allPhotos.filter((_, i) => selectedPhotos.has(i));
    await downloadPhotosAsZip(selected, 'fotos_seleccionadas.zip');
  };

  const downloadAll = async () => {
    await downloadPhotosAsZip(allPhotos, 'todas_las_fotos.zip');
  };

  if (allPhotos.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        <div className="text-center">
          <Image className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay fotos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5 text-[#156082]" />
          <h3 className="text-lg font-semibold text-gray-900">
            Galería de Fotos
          </h3>
          <span className="text-sm text-gray-500">
            ({allPhotos.length} fotos)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                       hover:bg-gray-50 transition-colors"
          >
            {selectedPhotos.size === allPhotos.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>

          {selectedPhotos.size > 0 && (
            <button
              onClick={downloadSelected}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm
                         bg-[#156082] text-white rounded-lg hover:bg-[#0d4a66]
                         transition-colors disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Descargar ({selectedPhotos.size})
            </button>
          )}

          <button
            onClick={downloadAll}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm
                       bg-green-600 text-white rounded-lg hover:bg-green-700
                       transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Descargar Todas
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {downloading && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-blue-700 font-medium">
              {progress}%
            </span>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {allPhotos.map((photo, index) => (
          <div
            key={index}
            className={`
              relative group rounded-lg overflow-hidden border-2 cursor-pointer
              transition-all duration-200
              ${selectedPhotos.has(index) ? 'border-[#156082] ring-2 ring-[#156082]/30' : 'border-gray-200 hover:border-gray-300'}
            `}
            onClick={() => togglePhoto(index)}
          >
            <img
              src={photo.url}
              alt={`Foto ${index + 1}`}
              className="w-full h-32 object-cover"
              loading="lazy"
            />

            {/* Selection indicator */}
            <div
              className={`
                absolute top-2 left-2 w-5 h-5 rounded-full border-2
                flex items-center justify-center transition-all
                ${selectedPhotos.has(index)
                  ? 'bg-[#156082] border-[#156082]'
                  : 'bg-white/80 border-gray-400 group-hover:border-gray-600'}
              `}
            >
              {selectedPhotos.has(index) && (
                <Check className="h-3 w-3 text-white" />
              )}
            </div>

            {/* Zoom button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewPhoto(photo);
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg
                         opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ZoomIn className="h-4 w-4 text-white" />
            </button>

            {/* Cliente name */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-xs text-white truncate">
                {photo.clienteName}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={previewPhoto.url}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-lg"
            />
            <div className="mt-2 text-center text-white">
              <p className="font-medium">{previewPhoto.clienteName}</p>
              <p className="text-sm text-gray-300">
                {getFilenameFromUrl(previewPhoto.url)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
