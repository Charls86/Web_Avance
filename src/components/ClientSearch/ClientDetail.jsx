import { X, Download, User, MapPin, Phone, Calendar, FileText, Eye, Image } from 'lucide-react';
import { formatDate } from '../../utils/dateHelpers';
import { usePhotos } from '../../hooks/usePhotos';

export default function ClientDetail({ cliente, onClose }) {
  const { getClientePhotos, downloadPhoto, downloadPhotosAsZip, getFilenameFromUrl } = usePhotos();

  if (!cliente) return null;

  const photos = getClientePhotos(cliente);

  const infoGroups = [
    {
      title: 'Información Personal',
      icon: User,
      fields: [
        { label: 'Nombre', value: cliente.nombre },
        { label: 'RUT', value: cliente.rut },
        { label: 'N° Cliente', value: cliente.numeroCliente },
      ]
    },
    {
      title: 'Contacto',
      icon: Phone,
      fields: [
        { label: 'Teléfono', value: cliente.telefono },
        { label: 'Teléfono 2', value: cliente.telefono2 },
        { label: 'Correo', value: cliente.correo },
      ]
    },
    {
      title: 'Ubicación',
      icon: MapPin,
      fields: [
        { label: 'Dirección', value: cliente.direccion },
        { label: 'Latitud', value: cliente.latitud },
        { label: 'Longitud', value: cliente.longitud },
        { label: 'Poste', value: cliente.poste },
      ]
    },
    {
      title: 'Medidor',
      icon: FileText,
      fields: [
        { label: 'Marca', value: cliente.marca },
        { label: 'Modelo', value: cliente.modelo },
        { label: 'Medidor Instalado', value: cliente.medidorInstalado },
        { label: 'Medidor Retirado', value: cliente.medidorRetirado },
      ]
    },
    {
      title: 'Registro',
      icon: Calendar,
      fields: [
        { label: 'Fecha Registro', value: formatDate(cliente.fechaRegistro) },
        { label: 'Solicitante', value: cliente.solicitante },
        { label: 'Origen Datos', value: cliente.origenDatos },
        { label: 'Relación', value: cliente.relacion },
      ]
    },
    {
      title: 'Observaciones',
      icon: FileText,
      fields: [
        { label: 'Aviso', value: cliente.aviso },
        { label: 'Comentarios', value: cliente.comentarios },
      ]
    },
  ];

  const handleDownloadAllPhotos = async () => {
    if (photos.length === 0) return;
    const photosWithInfo = photos.map(url => ({
      url,
      clienteName: cliente.nombre || cliente.numeroCliente || cliente.id
    }));
    await downloadPhotosAsZip(photosWithInfo, `fotos_${cliente.numeroCliente || cliente.id}.zip`);
  };

  const openPhoto = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#156082] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {cliente.nombre || 'Cliente sin nombre'}
            </h2>
            {cliente.numeroCliente && (
              <p className="text-white/80 text-sm">
                N° Cliente: {cliente.numeroCliente}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Photos Section */}
          {photos.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-[#156082]" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Fotografías ({photos.length})
                  </h3>
                </div>
                <button
                  onClick={handleDownloadAllPhotos}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm
                             bg-green-600 text-white rounded-lg hover:bg-green-700
                             transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Descargar Todas
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {photos.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-3">
                    <span className="text-sm font-medium text-gray-700">
                      Foto {index + 1}
                    </span>
                    <button
                      onClick={() => openPhoto(url)}
                      className="p-2 bg-[#156082] text-white rounded-lg hover:bg-[#0d4a66] transition-colors"
                      title="Ver foto"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => downloadPhoto(url)}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title="Descargar foto"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Groups */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {infoGroups.map((group, groupIndex) => {
              const Icon = group.icon;
              const hasValues = group.fields.some(f => f.value);

              if (!hasValues) return null;

              return (
                <div key={groupIndex} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-[#156082]" />
                    <h4 className="font-semibold text-gray-900">{group.title}</h4>
                  </div>

                  <div className="space-y-2">
                    {group.fields.map((field, fieldIndex) => (
                      field.value && (
                        <div key={fieldIndex} className="flex">
                          <span className="text-sm text-gray-500 w-32 flex-shrink-0">
                            {field.label}:
                          </span>
                          <span className="text-sm text-gray-900">
                            {field.value}
                          </span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
